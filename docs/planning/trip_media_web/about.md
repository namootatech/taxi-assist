# Trip Media – Expanded Product & System Specification (v2.1)

## Overview

**Trip Media** is Taxi Assist’s integrated advertising and rider rewards ecosystem designed to connect advertisers with verified commuter audiences across South Africa.

The platform transforms rider attention into measurable advertising engagement while simultaneously creating a new digital earning channel for commuters.

Unlike traditional advertising platforms where users passively consume ads, Trip Media introduces a **reward-based engagement economy** where riders voluntarily participate in ad viewing in exchange for wallet credits that can be used toward taxi rides and future platform services.

This creates a sustainable three-sided ecosystem:

| Stakeholder | Value Received                                  |
| ----------- | ----------------------------------------------- |
| Riders      | Earn ride credits by engaging with ads          |
| Advertisers | Guaranteed high-attention completed views       |
| Taxi Assist | Advertising revenue + increased rider retention |

The platform operates through:

- A **Rider App Earn Hub**
- A **Web-based Advertiser Portal**
- An existing **Taxi Assist Admin Dashboard**
- A **Moderation & Compliance System**
- A **Reward & Fraud Prevention Engine**
- A **Campaign Delivery System**

---

# 1. Core Product Philosophy

## The Problem Being Solved

### For Riders

Many commuters in South Africa are cost-sensitive and spend a meaningful portion of their income on transportation.

Trip Media gives riders a way to:

- Reduce transport costs
- Earn value without spending money
- Stay engaged with the Taxi Assist ecosystem even when not travelling

### For Advertisers

Traditional digital ads suffer from:

- Fake impressions
- Low attention spans
- Skipped videos
- Bot traffic
- Poor engagement quality

Trip Media solves this by ensuring:

- Ads are watched by real users
- Completion is required before reward payout
- Additional engagement (rating/commenting) improves attention quality
- Mobile-first targeting reaches real South African commuters

### For Taxi Assist

The system introduces:

- A scalable secondary revenue stream
- Increased rider retention
- More frequent app opens
- Improved wallet adoption
- Stronger ecosystem lock-in

---

# 2. Evolution of the Model

## Original Model (Old)

Initially, ads were only shown during active taxi trips.

### Limitations

- Limited inventory availability
- Ads only displayed during ride sessions
- Revenue tied directly to trip volume
- Riders could only earn while travelling

This constrained scalability.

---

## New Expanded Model (Current)

Ads can now be watched **anytime** through a dedicated rewards section inside the Rider App.

This fundamentally changes the platform from:

> “Ads during trips”

into

> “An on-demand mobile advertising rewards network.”

---

# 3. Platform Architecture Overview

Trip Media consists of three connected interfaces:

| Platform                    | Purpose                                                                           |
| --------------------------- | --------------------------------------------------------------------------------- |
| Rider App                   | Riders watch ads and earn wallet credits                                          |
| Advertiser Web App          | Businesses upload creatives and manage campaigns                                  |
| Taxi Assist Admin Dashboard | Internal moderation, approvals, fraud monitoring, analytics, and platform control |

The Admin Dashboard already exists and Trip Media will be integrated into it as an additional module rather than building an entirely separate administration system.

---

# 4. Advertiser Web App – Design & User Experience

The Advertiser Web App is designed as a **simple self-service advertising portal** focused on clarity and ease of use.

The goal is to avoid the complexity of platforms like Facebook Ads Manager or Google Ads while still giving advertisers meaningful control and analytics.

The interface should feel:

- Clean
- Fast
- Modern
- Mobile-friendly
- Business-oriented
- Simple enough for non-technical users

Many advertisers may be:

- Small local businesses
- Taxi route businesses
- Retail shops
- Spaza shops
- Restaurants
- Event promoters
- Local government campaigns

The system must therefore prioritize simplicity over advanced advertising complexity.

---

# 5. Advertiser Web App – Layout Structure

## Main Navigation Sidebar

The advertiser portal should use a permanent left sidebar layout.

### Sidebar Sections

| Menu Item        | Purpose                               |
| ---------------- | ------------------------------------- |
| Dashboard        | Overview of campaigns and spending    |
| Campaigns        | Create and manage campaigns           |
| Creatives        | Upload and manage ad videos           |
| Analytics        | Performance reporting                 |
| Wallet/Billing   | Credits, invoices, and payments       |
| Notifications    | Alerts and updates                    |
| Profile/Settings | Business profile and account settings |

The sidebar should include:

- Taxi Assist Media branding
- User account dropdown
- Logout button
- Support/help shortcut

---

# 6. Advertiser Dashboard (Landing Page)

The dashboard should provide a quick high-level overview immediately after login.

## Dashboard Cards

### Performance Overview

- Total completed views
- Active campaigns
- Total spend
- Average completion rate
- Wallet/credit balance

---

### Live Campaign Activity

- Campaigns currently running
- Daily performance
- Spend progress
- Estimated reach

---

### Alerts & Notifications

Examples:

- Campaign nearing budget limit
- Creative rejected
- Campaign paused
- Low wallet balance

---

### Quick Actions

Buttons:

- Create Campaign
- Upload Creative
- Add Funds
- Download Report

---

# 7. Campaign Management UI

The Campaigns page is the core operational area.

It should display campaigns in:

- Card layout
  or
- Data table view

Each campaign should show:

- Campaign name
- Status
- Delivery mode
- Spend progress
- Views delivered
- Completion rate
- Start/end date

---

## Campaign Status Types

| Status           | Meaning             |
| ---------------- | ------------------- |
| Draft            | Not launched        |
| Pending Approval | Awaiting moderation |
| Active           | Currently running   |
| Paused           | Temporarily stopped |
| Completed        | Campaign ended      |
| Rejected         | Violated policy     |

---

# 8. Creative Management UI

The Creatives section functions as a media library.

Advertisers can:

- Upload videos
- View moderation status
- Reuse creatives
- Replace outdated creatives
- Organize assets by category

---

## Creative Cards Should Display

- Thumbnail preview
- Video duration
- Upload date
- Approval status
- Usage count
- Linked campaigns

---

# 9. Analytics Experience

Analytics must remain understandable for non-technical businesses.

Avoid overwhelming users with excessive charts or advertising jargon.

---

## Core Analytics Sections

### Campaign Performance

- Views delivered
- Completed views
- Cost per completed view
- Engagement rate

---

### Delivery Breakdown

- Anytime vs In-Trip
- Performance by city
- Time-of-day engagement

---

### Creative Performance

Compare:

- Which videos perform best
- Which creatives have highest completion
- Which ads generate strongest engagement

---

# 10. Wallet & Billing System

Advertisers operate on a prepaid wallet system.

This simplifies:

- Budget management
- Campaign activation
- Automated billing

---

## Wallet Features

- Add funds
- View transaction history
- Download invoices
- Auto-pause campaigns on low balance
- Spend tracking

---

# 11. Taxi Assist Admin Dashboard Integration

Trip Media administration will be integrated into the **existing Taxi Assist Admin Dashboard** instead of creating a completely separate admin platform.

This reduces:

- Development duplication
- Operational complexity
- Staff training requirements

The existing admin system will gain new Trip Media management modules.

---

# 12. Admin Dashboard – New Trip Media Sections

## Admin Sidebar Additions

The existing admin dashboard sidebar will gain a new parent module:

### “Trip Media”

Expanding this module reveals:

| Admin Section    | Purpose                                |
| ---------------- | -------------------------------------- |
| Overview         | Platform-wide advertising metrics      |
| Campaigns        | Review and manage advertiser campaigns |
| Creatives Review | Approve/reject uploaded ads            |
| Advertisers      | Manage advertiser accounts             |
| Rider Rewards    | Monitor payout activity                |
| Fraud Monitoring | Detect suspicious behavior             |
| Analytics        | System-wide reporting                  |
| Reports          | Export reports and logs                |
| Settings         | Reward caps, rules, platform configs   |

---

# 13. Admin Overview Dashboard

This becomes the operational control center for the advertising ecosystem.

## Key Metrics

- Total ads watched today
- Total rewards paid today
- Active campaigns
- Pending creative reviews
- Fraud alerts
- Total advertiser spend
- Top-performing campaigns

---

# 14. Creative Moderation Panel

This is one of the most important admin areas.

Admins need an efficient workflow for reviewing uploaded creatives.

---

## Review Queue Features

Each creative review item should display:

- Video preview
- Advertiser name
- Upload timestamp
- Campaign associations
- Category tags

---

## Moderation Actions

Admins can:

- Approve
- Reject
- Request changes
- Suspend
- Flag for escalation

---

## Rejection Reasons

System should support predefined reasons:

- Misleading content
- Poor quality
- Offensive material
- Copyright violation
- Unsupported claims

Admins may also provide custom notes.

---

# 15. Campaign Oversight Tools

Admins require visibility into all campaigns.

## Admin Campaign Controls

Admins can:

- Pause campaigns
- Force-stop campaigns
- Adjust delivery settings
- Review targeting
- Monitor spend
- Investigate anomalies

---

# 16. Rider Reward Monitoring

The admin system should monitor:

- Total rewards issued
- Reward velocity
- Unusual earning behavior
- Failed transactions
- Wallet abuse patterns

---

## Reward Review Tools

Admins can:

- Freeze suspicious rewards
- Reverse fraudulent payouts
- Audit wallet histories
- View reward trails

---

# 17. Fraud Monitoring Dashboard

This section is essential for maintaining advertiser trust.

---

## Fraud Signals

Monitor:

- Rapid repeated ad completions
- Emulator usage
- Multiple accounts on same device
- Suspicious IP patterns
- Unrealistic engagement speed

---

## Fraud Risk Levels

| Level    | Meaning                 |
| -------- | ----------------------- |
| Low      | Normal activity         |
| Medium   | Suspicious patterns     |
| High     | Likely abuse            |
| Critical | Immediate investigation |

---

# 18. Admin Analytics

System-wide analytics help Taxi Assist understand:

- Platform profitability
- Rider engagement
- Ad inventory demand
- City-by-city performance

---

## Example Analytics

- Top-performing cities
- Average reward cost
- Completion trends
- Campaign retention
- Peak watch hours

---

# 19. Permissions & Admin Roles

Different staff members may require different access levels.

---

## Suggested Roles

| Role          | Access                     |
| ------------- | -------------------------- |
| Super Admin   | Full control               |
| Ad Moderator  | Creative approvals only    |
| Finance Admin | Billing and payouts        |
| Support Agent | View-only assistance tools |
| Fraud Analyst | Fraud monitoring tools     |

---

# 20. Design Direction

The overall system design should follow:

- Dark/light theme support
- Clean card-based layouts
- Simple navigation
- Responsive design
- Minimal clutter
- Fast loading pages

The design language should align with the existing Taxi Assist branding and admin dashboard styling to maintain ecosystem consistency.

---

# 21. Long-Term Vision

Trip Media should evolve beyond:

> “Watch ads for rewards”

Into:

> “Africa’s commuter engagement and rewards network.”

Potential future expansions:

- Surveys
- Sponsored challenges
- Interactive commerce
- Gamified brand experiences
- AI targeting
- Loyalty ecosystems
- Retail integrations
- Financial services partnerships

---

# 22. Final Product Positioning

Trip Media is not merely an advertising feature.

It is:

- A rider rewards ecosystem
- A verified mobile attention marketplace
- A commuter engagement platform
- A scalable ad monetization engine
- A retention layer for Taxi Assist

The “Anytime Ads” model transforms the platform from a trip-dependent ad system into a continuously active earning economy capable of scaling far beyond transportation alone.
