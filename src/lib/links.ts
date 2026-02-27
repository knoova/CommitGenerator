/**
 * Browser-safe module: no Node.js dependencies.
 * Imported by Remotion compositions (bundled with webpack for browser)
 * and by server-side code (description-cta.ts, pipeline.ts).
 */
export const THINKPINK_LINKS = [
  { url: "https://www.thinkpinkstudio.it", label: "sito Italia" },
  { url: "https://www.thinkpinkstudio.ug", label: "sito Uganda" },
  {
    url: "https://www.facebook.com/thinkpinkphoto",
    label: "Facebook",
  },
  {
    url: "https://www.linkedin.com/company/thinkpinkstudio/?viewAsMember=true",
    label: "LinkedIn",
  },
] as const;
