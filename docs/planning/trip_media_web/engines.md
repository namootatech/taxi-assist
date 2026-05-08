# Core Backend Systems – Detailed Functional Overview

These systems form the operational backbone of Trip Media.
While riders and advertisers interact with the visible interfaces, these backend systems ensure the platform remains:

- Safe
- Fair
- Scalable
- Advertiser-friendly
- Fraud-resistant
- Financially sustainable

Without these systems, the platform would be vulnerable to abuse, poor-quality advertising, inaccurate payouts, and loss of advertiser trust.

---

# 1. Moderation & Compliance System

## Purpose

The Moderation & Compliance System is responsible for ensuring that all advertising content published on Trip Media is:

- Safe for riders
- Legally compliant
- Brand appropriate
- Technically functional
- Suitable for the Taxi Assist ecosystem

This system protects:

- Riders from harmful or misleading ads
- Advertisers from low-quality platform environments
- Taxi Assist from legal and reputational risk

---

# Why Moderation Is Critical

Trip Media allows advertisers to self-upload content.

Without moderation:

- Scams could appear
- Offensive content could reach riders
- False advertising could damage trust
- Political or sensitive content could create backlash
- Low-quality ads could reduce engagement

Moderation ensures the platform maintains a professional and trustworthy advertising environment.

---

# Moderation Workflow

## Step 1 – Creative Upload

The advertiser uploads:

- Video file
- Thumbnail
- Campaign metadata
- CTA links
- Category tags

The system immediately stores the creative in a pending review state.

---

## Step 2 – Automated Validation

Before human review, automated checks run.

### Automated Checks Include

| Check                     | Purpose                   |
| ------------------------- | ------------------------- |
| File validation           | Ensure supported format   |
| Video duration limits     | Prevent invalid uploads   |
| Resolution checks         | Maintain viewing quality  |
| Corruption scanning       | Detect broken files       |
| Malware/security scanning | Prevent malicious uploads |
| Audio validation          | Detect muted/broken audio |
| Duplicate detection       | Prevent spam uploads      |

If the upload fails technical checks:

- The advertiser receives instant feedback
- The creative does not proceed to moderation

---

# Step 3 – Human Moderation Review

Approved moderators review submitted creatives through the Admin Dashboard.

Moderators assess:

- Advertising claims
- Brand safety
- Offensive material
- Scam indicators
- Financial claims
- Explicit content
- Hate speech
- Political sensitivity
- Copyright concerns

---

# Moderation Outcomes

## Approved

Creative becomes available for campaigns.

---

## Rejected

Creative is blocked from delivery.

The advertiser receives:

- Rejection reason
- Moderator notes
- Suggested corrections

---

## Needs Revision

Minor changes required before approval.

Example:

- Incorrect CTA
- Poor thumbnail
- Audio issues
- Missing disclaimers

---

# Compliance Considerations

The system should align with:

- South African advertising standards
- Consumer protection guidelines
- Platform content policies

Future compliance categories may include:

- Gambling restrictions
- Financial services advertising
- Alcohol-related advertising
- Political campaign regulation

---

# Moderation Queue System

The moderation dashboard should prioritize:

- New uploads
- High-budget campaigns
- Previously flagged advertisers
- Escalated creatives

This helps maintain operational efficiency.

---

# Future AI-Assisted Moderation

In later versions, AI-assisted moderation may help detect:

- Explicit imagery
- Offensive language
- Suspicious content patterns
- Unsafe links
- Duplicate scam campaigns

Human moderators would still make final decisions.

---

# 2. Reward & Fraud Prevention Engine

## Purpose

The Reward & Fraud Prevention Engine protects the financial integrity of the Trip Media ecosystem.

This system ensures:

- Riders only earn for legitimate engagement
- Advertisers only pay for valid views
- Reward abuse is minimized
- Fraudulent activity is detected early

This is one of the most critical systems in the platform.

Without it:

- Fake users could drain advertiser budgets
- Bots could simulate ad watches
- Wallet rewards could become financially unsustainable

---

# Why Fraud Prevention Is Essential

Trip Media directly rewards users with monetary value.

Any system involving:

- Rewards
- Wallet balances
- Cash-equivalent credits

will naturally attract abuse attempts.

Fraud prevention is therefore not optional — it is foundational.

---

# Types of Fraud Risks

## Fake Account Creation

Users creating multiple accounts to repeatedly earn rewards.

---

## Device Farming

One user operating many accounts from one device or emulator environment.

---

## Bot Activity

Automated scripts simulating video views.

---

## Rapid Interaction Abuse

Users instantly completing engagement flows unnaturally fast.

---

## Emulator Abuse

Virtual Android devices simulating hundreds of fake riders.

---

## VPN & Proxy Abuse

Attempts to bypass geographic or account restrictions.

---

# Fraud Prevention Layers

The system should use multiple protection layers simultaneously.

No single fraud check is sufficient.

---

# Layer 1 – Device Intelligence

The app collects non-invasive device signals such as:

- Device fingerprint
- OS version
- App integrity
- Emulator indicators
- Root/jailbreak detection

This helps identify suspicious environments.

---

# Layer 2 – Behavioral Analysis

The system evaluates rider behavior patterns.

### Suspicious Behaviors

- Watching ads too quickly
- Perfect repetitive timing
- Identical engagement patterns
- Extremely high watch volumes
- Non-human interaction timing

The system assigns a risk score to each rider session.

---

# Layer 3 – Session Validation

Rewards are only granted if:

- Minimum watch thresholds are met
- The app remains in focus
- Playback is active
- Engagement actions are completed properly

If a rider backgrounds the app repeatedly:

- Reward eligibility may fail

---

# Layer 4 – Reward Validation

Before wallet credit is finalized:

- Fraud checks run
- Session integrity is verified
- Duplicate activity is checked
- Risk score is evaluated

High-risk sessions may:

- Delay payouts
- Trigger manual review
- Be rejected entirely

---

# Fraud Risk Scoring

Every rider may have a dynamic fraud-risk score.

| Risk Level | Action                    |
| ---------- | ------------------------- |
| Low        | Normal reward processing  |
| Medium     | Increased monitoring      |
| High       | Delayed rewards           |
| Critical   | Account suspension/review |

---

# Reward Protection Features

## Daily Caps

Prevent unlimited earning abuse.

Example:

- Max R50/day
- Max 20 ads/day

---

## Cooldown Timers

Prevent rapid repetitive watching.

Example:

- 30–90 seconds between ads

---

## Session Limits

Prevent endless viewing loops.

Example:

- Max ads per session

---

# Fraud Monitoring Dashboard

Admins can monitor:

- Suspicious accounts
- High-risk devices
- Fraud spikes
- Reward anomalies
- Geographic irregularities

This becomes an operational security center for Trip Media.

---

# 3. Campaign Delivery System

## Purpose

The Campaign Delivery System is the engine responsible for deciding:

- Which ad gets shown
- To which rider
- At what time
- Under which conditions
- How often

It acts as the intelligence layer connecting:

- Advertisers
- Campaign rules
- Rider availability
- Reward logic

---

# Why the Delivery System Matters

A poorly designed delivery system causes:

- Repetitive ads
- Poor targeting
- Budget overspending
- Rider annoyance
- Low advertiser ROI

The delivery engine ensures efficient and balanced ad distribution.

---

# Campaign Delivery Flow

## Step 1 – Rider Opens Earn Hub

The system checks:

- Available campaigns
- Rider eligibility
- Current reward caps
- Fraud status
- Geographic relevance

---

## Step 2 – Campaign Matching

The engine identifies campaigns matching:

- Rider location
- Time schedule
- Delivery mode
- Frequency rules
- Audience targeting

---

# Step 3 – Ad Prioritization

The engine ranks eligible ads using factors such as:

- Campaign budget availability
- Remaining daily limits
- Completion performance
- Reward amount
- Campaign priority tier

---

# Example Prioritization Logic

A premium campaign may receive higher delivery priority because:

- Higher advertiser spend
- Better engagement history
- Enterprise subscription tier

---

# Step 4 – Ad Serving

The selected creative is streamed to the rider.

The system creates:

- Ad session record
- Tracking session
- Completion monitoring

---

# Frequency Capping

To prevent rider fatigue:

- Same ad cannot repeat excessively
- Hourly limits are enforced
- Daily ad exposure is controlled

Example:

- Same creative max 3 times/day
- Max 10 total ads/hour

---

# Smart Delivery Optimization

Over time, the system may optimize delivery using:

- Completion rates
- Engagement quality
- City performance
- Time-of-day behavior
- Rider preferences

This improves:

- Advertiser ROI
- Rider experience
- Platform revenue efficiency

---

# Delivery Modes

## Anytime Delivery

Ads shown whenever riders voluntarily access Earn Hub.

Highest scale model.

---

## In-Trip Delivery

Ads shown during active ride sessions.

Premium attention environment.

---

## Hybrid Delivery

Combination of both delivery types.

Allows broader reach and stronger campaign flexibility.

---

# Campaign Budget Protection

The delivery engine also protects advertiser budgets.

The system ensures:

- Campaigns stop at spend limits
- Daily caps are respected
- Over-delivery does not occur

This creates predictable spending behavior.

---

# Real-Time Delivery Monitoring

Admins should be able to monitor:

- Active ad delivery
- Delivery volume spikes
- Campaign pacing
- Geographic distribution
- Reward payout velocity

This helps detect operational issues early.

---

# Future Evolution of the Delivery Engine

As Trip Media scales, the delivery engine may evolve into a more intelligent recommendation system powered by:

- Machine learning
- Engagement prediction
- Personalized delivery
- Context-aware targeting
- Dynamic reward balancing

The long-term goal is to maximize:

- Rider engagement
- Advertiser performance
- Platform profitability
- Reward sustainability
