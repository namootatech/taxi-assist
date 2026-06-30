"use client"

import { useRef, useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { UploadCloud } from "lucide-react"
import { toast } from "sonner"
import {
  ACCEPTED_CREATIVE_TYPES,
  MAX_CREATIVE_BYTES,
  PORTRAIT_HEIGHT,
  PORTRAIT_WIDTH,
} from "@/lib/campaign/types"
import { createSupabaseBrowserClient } from "@/lib/supabase/browser"
import { createCreative } from "./actions"

const ACCEPTED = ACCEPTED_CREATIVE_TYPES.join(",")
const MAX_BYTES = MAX_CREATIVE_BYTES

const formSchema = z.object({
  title: z.string().trim().min(2, "Add a title."),
})

type FormValues = z.infer<typeof formSchema>

async function readVideoDuration(file: File): Promise<number | undefined> {
  if (!file.type.startsWith("video/")) return undefined
  return await new Promise((resolve) => {
    const video = document.createElement("video")
    video.preload = "metadata"
    video.onloadedmetadata = () => {
      const duration = Math.round(video.duration)
      URL.revokeObjectURL(video.src)
      resolve(Number.isFinite(duration) ? duration : undefined)
    }
    video.onerror = () => resolve(undefined)
    video.src = URL.createObjectURL(file)
  })
}

async function validatePortraitDimensions(file: File): Promise<boolean> {
  if (file.type.startsWith("video/")) {
    return await new Promise((resolve) => {
      const video = document.createElement("video")
      video.preload = "metadata"
      video.onloadedmetadata = () => {
        const ok = video.videoWidth === PORTRAIT_WIDTH && video.videoHeight === PORTRAIT_HEIGHT
        URL.revokeObjectURL(video.src)
        resolve(ok)
      }
      video.onerror = () => resolve(false)
      video.src = URL.createObjectURL(file)
    })
  }

  return await new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      resolve(img.width === PORTRAIT_WIDTH && img.height === PORTRAIT_HEIGHT)
      URL.revokeObjectURL(img.src)
    }
    img.onerror = () => resolve(false)
    img.src = URL.createObjectURL(file)
  })
}

function generateId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function extensionForMime(mime: string): string {
  if (mime === "video/mp4") return "mp4"
  if (mime === "video/quicktime") return "mov"
  if (mime === "image/png") return "png"
  return "jpg"
}

export function CreativeUploader({ partnerId }: { partnerId: string }) {
  const [file, setFile] = useState<File | null>(null)
  const [pending, startTransition] = useTransition()
  const [progress, setProgress] = useState<string | null>(null)
  const dropRef = useRef<HTMLDivElement | null>(null)
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { title: "" },
  })

  const handleSubmit = form.handleSubmit((values) => {
    if (!file) {
      toast.error("Add a video or image first.")
      return
    }
    if (!ACCEPTED_CREATIVE_TYPES.includes(file.type as (typeof ACCEPTED_CREATIVE_TYPES)[number])) {
      toast.error("Only MP4, MOV, JPEG, or PNG are accepted.")
      return
    }
    if (file.size > MAX_BYTES) {
      toast.error("File is over 300MB. Compress and try again.")
      return
    }

    startTransition(async () => {
      const portraitOk = await validatePortraitDimensions(file)
      if (!portraitOk) {
        toast.error(`Creative must be portrait ${PORTRAIT_WIDTH}×${PORTRAIT_HEIGHT}.`)
        return
      }

      try {
        const supabase = createSupabaseBrowserClient()
        const id = generateId()
        const ext = extensionForMime(file.type)
        const storagePath = `${partnerId}/${id}.${ext}`

        setProgress("Reading file...")
        const duration = await readVideoDuration(file)

        setProgress("Uploading to storage...")
        const { error: uploadError } = await supabase.storage
          .from("partner-ad-creatives")
          .upload(storagePath, file, { contentType: file.type, upsert: false })

        if (uploadError) {
          toast.error(uploadError.message)
          return
        }

        setProgress("Saving creative...")
        const result = await createCreative({
          title: values.title,
          storage_path: storagePath,
          mime_type: file.type,
          duration_seconds: duration,
        })

        if (!result.success) {
          toast.error(result.message ?? "Could not save creative.")
          return
        }

        toast.success("Creative uploaded. Submit it for review when ready.")
        form.reset()
        setFile(null)
      } catch {
        toast.error("Upload failed. Try again.")
      } finally {
        setProgress(null)
      }
    })
  })

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <div
        ref={dropRef}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          const dropped = e.dataTransfer.files[0]
          if (dropped) setFile(dropped)
        }}
        className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[var(--border)] bg-white/5 px-6 py-10 text-center"
        onClick={() => dropRef.current?.querySelector("input")?.click()}
      >
        <UploadCloud className="h-10 w-10 text-slate-300" />
        <p className="text-sm font-semibold">{file ? file.name : "Drop portrait creative here"}</p>
        <p className="text-xs text-slate-400">1080×1920 · MP4, MOV, JPG, PNG · max 300MB</p>
        <input
          type="file"
          accept={ACCEPTED}
          className="hidden"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </div>

      <label className="grid gap-2 text-sm font-semibold">
        Title
        <input {...form.register("title")} className="rounded-xl border border-[var(--border)] bg-white/8 px-4 py-3 text-white" />
      </label>

      {progress ? <p className="text-xs text-slate-400">{progress}</p> : null}

      <button
        type="submit"
        disabled={pending}
        className="focus-ring rounded-full bg-[var(--brand-red)] px-5 py-3 text-sm font-black text-white disabled:opacity-60"
      >
        {pending ? "Uploading..." : "Upload creative"}
      </button>
    </form>
  )
}
