"use client"

import { useRef, useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { UploadCloud } from "lucide-react"
import { toast } from "sonner"
import { createSupabaseBrowserClient } from "@/lib/supabase/browser"
import { createCreative } from "./actions"

const ACCEPTED = "image/png,image/jpeg,video/mp4"
const MAX_BYTES = 60 * 1024 * 1024

const formSchema = z.object({
  title: z.string().trim().min(2, "Add a title."),
  cta_url: z.string().trim().url("Use a full https:// URL.").optional().or(z.literal("")),
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

function generateId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export function CreativeUploader({ partnerId }: { partnerId: string }) {
  const [file, setFile] = useState<File | null>(null)
  const [pending, startTransition] = useTransition()
  const [progress, setProgress] = useState<string | null>(null)
  const dropRef = useRef<HTMLDivElement | null>(null)
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { title: "", cta_url: "" },
  })

  const handleSubmit = form.handleSubmit((values) => {
    if (!file) {
      toast.error("Add a video or image first.")
      return
    }
    if (!ACCEPTED.split(",").includes(file.type)) {
      toast.error("Only MP4 video, JPEG, or PNG are accepted.")
      return
    }
    if (file.size > MAX_BYTES) {
      toast.error("File is over 60MB. Compress and try again.")
      return
    }

    startTransition(async () => {
      try {
        const supabase = createSupabaseBrowserClient()
        const id = generateId()
        const ext = file.type === "video/mp4" ? "mp4" : file.type === "image/png" ? "png" : "jpg"
        const storagePath = `${partnerId}/${id}.${ext}`

        setProgress("Reading file...")
        const duration = await readVideoDuration(file)

        setProgress("Uploading to storage...")
        const { error: uploadError } = await supabase.storage
          .from("partner-ad-creatives")
          .upload(storagePath, file, {
            contentType: file.type,
            upsert: false,
          })

        if (uploadError) {
          toast.error("Upload failed. Check the file size and your role.")
          setProgress(null)
          return
        }

        setProgress("Saving metadata...")
        const result = await createCreative({
          id,
          storage_path: storagePath,
          mime_type: file.type as "image/png" | "image/jpeg" | "video/mp4",
          duration_seconds: duration,
          title: values.title,
          cta_url: values.cta_url || "",
        })

        if (!result.success) {
          await supabase.storage.from("partner-ad-creatives").remove([storagePath])
          toast.error(result.message || "Could not save the creative metadata.")
          setProgress(null)
          return
        }

        toast.success("Creative uploaded. Submit it for review when ready.")
        form.reset({ title: "", cta_url: "" })
        setFile(null)
      } catch (uploadError) {
        toast.error("Upload failed. Try again or contact support.")
        console.error(uploadError)
      } finally {
        setProgress(null)
      }
    })
  })

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const next = event.target.files?.[0]
    setFile(next ?? null)
  }

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    const dropped = event.dataTransfer.files?.[0]
    if (dropped) setFile(dropped)
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <div
        ref={dropRef}
        onDragOver={(event) => event.preventDefault()}
        onDrop={handleDrop}
        className="rounded-2xl border border-dashed border-[var(--border)] bg-white/4 p-6 text-center"
      >
        <UploadCloud className="mx-auto size-7 text-red-200" aria-hidden />
        <p className="mt-3 text-sm font-bold">Drop a video or image here</p>
        <p className="mt-1 text-xs muted">MP4, JPEG, or PNG up to 60MB</p>
        <input
          type="file"
          accept={ACCEPTED}
          onChange={handleFileChange}
          className="mt-4 block w-full text-xs text-white/80 file:mr-3 file:rounded-full file:border file:border-[var(--border)] file:bg-white/8 file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-white"
        />
        {file ? (
          <p className="mt-3 text-xs muted">
            Selected: <span className="font-bold text-white">{file.name}</span> ·{" "}
            {(file.size / 1024 / 1024).toFixed(1)}MB · {file.type}
          </p>
        ) : null}
      </div>

      <label className="grid gap-2 text-sm font-semibold">
        Creative title
        <input
          {...form.register("title")}
          className="focus-ring rounded-xl border border-[var(--border)] bg-white/8 px-4 py-3 text-white"
        />
        {form.formState.errors.title ? (
          <span className="text-xs text-red-200">{form.formState.errors.title.message}</span>
        ) : null}
      </label>

      <label className="grid gap-2 text-sm font-semibold">
        Landing URL (optional)
        <input
          type="url"
          placeholder="https://example.com"
          {...form.register("cta_url")}
          className="focus-ring rounded-xl border border-[var(--border)] bg-white/8 px-4 py-3 text-white"
        />
        {form.formState.errors.cta_url ? (
          <span className="text-xs text-red-200">{form.formState.errors.cta_url.message}</span>
        ) : null}
      </label>

      <button
        type="submit"
        disabled={pending}
        className="focus-ring rounded-full bg-[var(--brand-red)] px-5 py-3 text-sm font-black text-white disabled:opacity-60"
      >
        {pending ? progress ?? "Uploading..." : "Upload creative"}
      </button>
    </form>
  )
}
