import { Card, PageHeader } from "@/components/app/PageHeader";
import { errorMessage, useAppData } from "@/components/app/useAppData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/convex/_generated/api";
import { BUSINESS_TYPES, GOALS } from "@/convex/lib/strategy";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { useMutation } from "convex/react";
import { Check, CreditCard, Loader2, LogOut } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";
import { ENGAGEMENT, FOLLOWERS, FREQUENCY, TONES } from "../Onboarding";

const splitList = (s: string) => s.split(/[,\n]/).map((x) => x.trim()).filter(Boolean);

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active} className={cn("rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors", active ? "bg-primary text-primary-foreground" : "border border-hairline bg-white text-ink hover:border-forest-300")}>
      {children}
    </button>
  );
}

function Field({ label, children, optional }: { label: string; children: React.ReactNode; optional?: boolean }) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-ink">{label}{optional && <span className="ml-1.5 text-xs font-normal text-secondary-text">Optional</span>}</Label>
      {children}
    </div>
  );
}

const input = "h-11 rounded-xl border-hairline bg-white";
const area = "min-h-20 rounded-xl border-hairline bg-white";

export default function SettingsPage() {
  const { business, usage } = useAppData();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const updateProfile = useMutation(api.businesses.updateProfile);
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState({
    businessName: business.businessName,
    businessType: business.businessType,
    location: business.location,
    website: business.website ?? "",
    instagram: business.instagram ?? "",
    targetCustomers: business.targetCustomers,
    mainGoal: business.mainGoal ?? business.goals[0] ?? "",
    goals: business.goals,
    igFollowers: business.igFollowers ?? "",
    postingFrequency: business.postingFrequency ?? "",
    engagement: business.engagement ?? "",
    products: business.products.join("\n"),
    differentiator: business.differentiator ?? "",
    tone: business.tone ?? business.brandPersonality[0] ?? "",
    contentLikes: business.contentLikes ?? "",
    contentDislikes: business.contentDislikes ?? "",
    competitors: (business.competitors ?? []).join(", "),
    challenges: business.challenges ?? "",
  });
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((s) => ({ ...s, [k]: v }));

  const save = async () => {
    if (!f.businessName.trim() || !f.location.trim() || !f.targetCustomers.trim()) {
      toast.error("Business name, location and audience are required.");
      return;
    }
    setSaving(true);
    try {
      const goals = [f.mainGoal, ...f.goals.filter((g) => g !== f.mainGoal)].filter(Boolean);
      await updateProfile({
        businessName: f.businessName.trim(),
        businessType: f.businessType,
        location: f.location.trim(),
        website: f.website.trim(),
        instagram: f.instagram.trim(),
        targetCustomers: f.targetCustomers.trim(),
        mainGoal: f.mainGoal,
        goals,
        igFollowers: f.igFollowers,
        postingFrequency: f.postingFrequency,
        engagement: f.engagement,
        products: splitList(f.products),
        differentiator: f.differentiator.trim(),
        tone: f.tone,
        brandPersonality: f.tone ? [f.tone] : [],
        contentLikes: f.contentLikes.trim(),
        contentDislikes: f.contentDislikes.trim(),
        competitors: splitList(f.competitors),
        challenges: f.challenges.trim(),
      });
      toast.success("Profile saved. Changes apply to your next generated plan.");
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader title="Settings" description="Your business profile, plan and account." />
      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Card eyebrow="Business profile" title="What Cloudy knows about you" actions={
          <Button className="rounded-full" onClick={save} disabled={saving}>{saving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />} Save changes</Button>
        }>
          <p className="mb-6 text-xs text-secondary-text">Changes apply to the next plan, strategy or content you generate.</p>
          <div className="space-y-6">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Business name"><Input className={input} value={f.businessName} onChange={(e) => set("businessName", e.target.value)} /></Field>
              <Field label="Business type">
                <select value={f.businessType} onChange={(e) => set("businessType", e.target.value)} className="h-11 w-full rounded-xl border border-hairline bg-white px-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-forest-600/40">
                  {BUSINESS_TYPES.map((b) => <option key={b.id} value={b.id}>{b.emoji} {b.label}</option>)}
                </select>
              </Field>
              <Field label="Location"><Input className={input} value={f.location} onChange={(e) => set("location", e.target.value)} /></Field>
              <Field label="Website" optional><Input className={input} value={f.website} onChange={(e) => set("website", e.target.value)} /></Field>
              <Field label="Instagram" optional><Input className={input} value={f.instagram} onChange={(e) => set("instagram", e.target.value)} /></Field>
            </div>
            <Field label="Target audience"><Textarea className={area} value={f.targetCustomers} onChange={(e) => set("targetCustomers", e.target.value)} /></Field>
            <Field label="Main goal">
              <div className="flex flex-wrap gap-2">{GOALS.map((g) => <Chip key={g.id} active={f.mainGoal === g.id} onClick={() => set("mainGoal", g.id)}>{g.emoji} {g.id}</Chip>)}</div>
            </Field>
            <Field label="Other goals" optional>
              <div className="flex flex-wrap gap-2">{GOALS.filter((g) => g.id !== f.mainGoal).map((g) => { const on = f.goals.includes(g.id); return <Chip key={g.id} active={on} onClick={() => set("goals", on ? f.goals.filter((x) => x !== g.id) : [...f.goals, g.id])}>{g.id}</Chip>; })}</div>
            </Field>
            <div className="grid gap-5 lg:grid-cols-3">
              <Field label="Followers"><div className="flex flex-wrap gap-2">{FOLLOWERS.map((o) => <Chip key={o.id} active={f.igFollowers === o.id} onClick={() => set("igFollowers", o.id)}>{o.label}</Chip>)}</div></Field>
              <Field label="Posting frequency"><div className="flex flex-wrap gap-2">{FREQUENCY.map((o) => <Chip key={o.id} active={f.postingFrequency === o.id} onClick={() => set("postingFrequency", o.id)}>{o.label}</Chip>)}</div></Field>
              <Field label="Engagement"><div className="flex flex-wrap gap-2">{ENGAGEMENT.map((o) => <Chip key={o.id} active={f.engagement === o.id} onClick={() => set("engagement", o.id)}>{o.label}</Chip>)}</div></Field>
            </div>
            <Field label="Products / services"><Textarea className={area} value={f.products} onChange={(e) => set("products", e.target.value)} /></Field>
            <Field label="What makes you different" optional><Textarea className={area} value={f.differentiator} onChange={(e) => set("differentiator", e.target.value)} /></Field>
            <Field label="Brand tone"><div className="flex flex-wrap gap-2">{TONES.map((t) => <Chip key={t} active={f.tone === t} onClick={() => set("tone", t)}>{t}</Chip>)}</div></Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Content you like" optional><Textarea className={area} value={f.contentLikes} onChange={(e) => set("contentLikes", e.target.value)} /></Field>
              <Field label="Content you don't want" optional><Textarea className={area} value={f.contentDislikes} onChange={(e) => set("contentDislikes", e.target.value)} /></Field>
            </div>
            <Field label="Competitors" optional><Input className={input} value={f.competitors} onChange={(e) => set("competitors", e.target.value)} placeholder="Comma-separated" /></Field>
            <Field label="Marketing challenges" optional><Textarea className={area} value={f.challenges} onChange={(e) => set("challenges", e.target.value)} /></Field>
          </div>
        </Card>

        <div className="space-y-6">
          <Card eyebrow="Plan & billing" title={usage ? `${usage.planName} plan` : "Plan"}>
            {usage ? (
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-sage px-2.5 py-0.5 text-[11px] font-semibold capitalize text-forest-700">{usage.isTrial ? "Free trial" : usage.status}</span>
                  {usage.periodEnd && <span className="text-xs text-secondary-text">Renews {new Date(usage.periodEnd).toLocaleDateString()}</span>}
                </div>
                <Row k="AI credits" v={`${usage.credits.used} / ${usage.credits.limit} used`} />
                <Row k="30-day plans" v={`${usage.plans.used} / ${usage.plans.limit} this month`} />
                <Row k="Regeneration" v={usage.limits.regeneration === "week" ? "Entire weeks" : usage.limits.regeneration === "day" ? "Entire days" : "Individual posts"} />
                <Button asChild variant="outline" className="mt-2 w-full rounded-full"><Link to="/billing"><CreditCard className="size-4" />{usage.plan === "pro" && !usage.isTrial ? "Manage billing" : "Upgrade plan"}</Link></Button>
              </div>
            ) : <p className="text-sm text-secondary-text">Loading…</p>}
          </Card>
          <Card eyebrow="Account" title="Your account">
            <p className="text-sm text-ink">{user?.email ?? (user?.isAnonymous ? "Guest account" : "—")}</p>
            {user?.name && <p className="text-xs text-secondary-text">{user.name}</p>}
            <Button variant="ghost" className="mt-4 -ml-2 rounded-full text-secondary-text" onClick={async () => { await signOut(); navigate("/"); }}>
              <LogOut className="size-4" /> Sign out
            </Button>
          </Card>
        </div>
      </div>
    </>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-hairline py-2 last:border-0">
      <span className="text-secondary-text">{k}</span>
      <span className="text-right text-ink">{v}</span>
    </div>
  );
}
