/**
 * Motion Component Library V1 — catalog for Director prompts + tooling.
 * Prefer these over primitive text/shape/image layers.
 */
export const COMPONENT_CATALOG = {
  marketing: [
    { id: "MetricCard", props: "label, value, icon?, accent?, countUp?, glass?, shadow?" },
    { id: "KPITile", props: "label, value, accent?, countUp?" },
    { id: "StatisticBlock", props: "label, value, accent?, countUp?" },
    { id: "PricingCard", props: "plan, price, period?, features[], featured?, cta?, glass?, shadow?" },
    { id: "FeatureCard", props: "title, body, icon?, accent?" },
    { id: "BenefitCard", props: "title, body, icon?, accent?" },
    { id: "ComparisonCard", props: "leftTitle, rightTitle, leftItems[], rightItems[]" },
    { id: "TestimonialCard", props: "quote, author, role?" },
    { id: "Badge", props: "label, color?" },
    { id: "BrandChip", props: "label, color?" },
    { id: "CTABanner", props: "title, subtitle?, cta?, accent?" },
  ],
  ui: [
    { id: "BrowserWindow", props: "title?, url?, body?" },
    { id: "BrowserMockup", props: "title?, url?, body?" },
    { id: "Dashboard", props: "title?, metrics[]?" },
    { id: "Sidebar", props: "items[], active?" },
    { id: "TopNavigation", props: "brandName?, items[]" },
    { id: "SearchBar", props: "query?, placeholder?" },
    { id: "ChatWindow", props: "question, answer, citations[]?, sources[]?, typingSpeed?" },
    { id: "ChatDemo", props: "question, answer, sources[]?" },
    { id: "AIResponse", props: "question, answer, citations[]?" },
    { id: "Notification", props: "title, body" },
    { id: "FloatingTooltip", props: "text|label" },
    { id: "Modal", props: "title, body, cta?" },
    { id: "CommandPalette", props: "query?, items[]" },
    { id: "SettingsPanel", props: "title?, items[]" },
    { id: "CodeEditor", props: "code?" },
    { id: "TerminalWindow", props: "lines[]" },
  ],
  devices: [
    { id: "iPhone", props: "title?, body?, ui?=claude|simple, mode?=home|chat, greeting?, placeholder?, model?, chips[]?, messages[{role,text}]?, screenColor?, frame?=true" },
    { id: "ClaudeMobileHome", props: "mode?=home|chat, greeting?, messages[{role:user|assistant, text}], placeholder?, model?, chips[]?" },
    { id: "AndroidPhone", props: "title?, body?" },
    { id: "Tablet", props: "title?, body?" },
    { id: "MacBook", props: "title?, body?" },
    { id: "Laptop", props: "title?, body?" },
    { id: "DesktopMonitor", props: "title?, body?" },
  ],
  brand: [
    { id: "LogoLockup", props: "wordmark, tagline?, logo?=capsule|claude, color?" },
    { id: "Wordmark", props: "text|wordmark, color?" },
    { id: "PillHero", props: "topColor?, bottomColor?, color?, spin?, float?, tilt?" },
    { id: "Capsule3D", props: "topColor?, bottomColor?, color?, spin?, float?, tilt?" },
    { id: "IconGrid", props: "items[]" },
    { id: "TrustBadge", props: "label" },
    { id: "CompanyLogoRow", props: "logos[]|items[]" },
    { id: "SocialProofRow", props: "stats[]" },
  ],
  commerce: [
    { id: "ProductCard", props: "title, price, tag?" },
    { id: "ProductGrid", props: "items[]" },
    { id: "CheckoutScreen", props: "total?, cta?" },
    { id: "ShoppingCart", props: "items[]" },
    { id: "ReviewCard", props: "quote, author, rating?" },
    { id: "RatingStars", props: "rating" },
    { id: "BeforeAfterComparison", props: "before, after" },
    { id: "OfferStack", props: "offers[]" },
    { id: "GuaranteeBox", props: "title, body" },
  ],
  data: [
    { id: "LineChart", props: "title?, values[]?" },
    { id: "BarChart", props: "title?, values[]?, labels[]?" },
    { id: "PieChart", props: "title?" },
    { id: "GrowthCurve", props: "title?, values[]?" },
    { id: "Timeline", props: "steps[]|items[]" },
    { id: "Funnel", props: "stages[]" },
    { id: "ProgressRing", props: "value" },
    { id: "Counter", props: "value, label?" },
    { id: "AnimatedGraph", props: "title?, values[]?" },
  ],
  media: [
    { id: "BookCoverCarousel", props: "titles[]" },
    { id: "BookCoverStream", props: "titles[]" },
    { id: "CourseCarousel", props: "titles[]" },
    { id: "ImageStack", props: "items[]" },
    { id: "ScreenshotGallery", props: "items[]" },
    { id: "VideoThumbnail", props: "title?" },
    { id: "FloatingMediaWall", props: "items[]?" },
  ],
  backgrounds: [
    { id: "ParticleField", props: "count?, color?, mode?, showCapsule?=false, seed? — atmosphere only; put logo on PillHero" },
    { id: "GradientBlob", props: "color?" },
    { id: "AnimatedGrid", props: "color?" },
    { id: "OrbitalLines", props: "color?" },
    { id: "FloatingShapes", props: "color?" },
    { id: "NoiseOverlay", props: "" },
    { id: "GlowField", props: "color?" },
    { id: "MeshGradient", props: "color?, secondary?" },
    { id: "Aurora", props: "color?" },
    { id: "BlueprintGrid", props: "color?" },
  ],
  motion: [
    { id: "SequentialReveal", props: "items[]" },
    { id: "StaggerGrid", props: "items[]" },
    { id: "CardStack", props: "items[]" },
    { id: "InfiniteHorizontalCarousel", props: "items[]" },
    { id: "InfiniteVerticalCarousel", props: "items[]" },
    { id: "Marquee", props: "items[]" },
    { id: "FloatingLayerGroup", props: "items[]" },
    { id: "ExplodedLayout", props: "items[]" },
    { id: "IsometricStack", props: "items[]" },
  ],
} as const;

export function catalogPromptBlock(): string {
  const lines: string[] = [
    "COMPONENT LIBRARY V1 — prefer these over primitive text/shape/image layers:",
  ];
  for (const [cat, items] of Object.entries(COMPONENT_CATALOG)) {
    lines.push(`${cat}:`);
    for (const c of items) {
      lines.push(`  - ${c.id} { ${c.props} }`);
    }
  }
  lines.push(
    "Rules: compose scenes from components; primitives only when no component fits. Capsule/PillHero max intro+outro.",
    "Layout: x,y are TOP-LEFT (not center). Full-bleed BG at 0,0,canvasW,canvasH. Hero pill = separate centered PillHero; ParticleField showCapsule false.",
    "Claude mobile UI: MUST use iPhone with props.ui:\"claude\" (or ClaudeMobileHome). Real frame builtin:iphone-frame. On 9:16 the phone layer is auto-sized ~92% canvas width — do NOT nest BrowserWindow. Inside screen: cream is WRONG for current Claude dark home — use dark #1a1a1a, Logo mark builtin:claude-mark, greeting serif, composer, chips. Text must live ONLY inside the phone screen (no free-floating headlines outside the device).",
    "Static assets: builtin:claude-mark, builtin:iphone-frame, /assets/claude-home-screen.png (reference).",
  );
  return lines.join("\n");
}

export const ALL_COMPONENT_IDS: string[] = Object.values(COMPONENT_CATALOG).flatMap((g) =>
  g.map((c) => c.id),
);
