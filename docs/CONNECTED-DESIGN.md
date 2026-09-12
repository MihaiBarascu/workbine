# Connected community design

The owner’s September 12 reference supersedes the earlier flat discovery layout.
Discovery uses a left navigation rail, a bright atmospheric globe behind the
header/content, compact two-column contribution cards, and a dismissible guide.
Categories appear as plain text beside titles, never over photos. The composer
says **Create topic** and opens the existing form; publication remains explicit.

The existing Instrument Sans family uses stronger display weights and restrained
body/utility sizes. The palette is cloud `#f5f8fd`, white `#ffffff`, ink `#1e2b3d`,
muted blue `#57708f`, connection blue `#2455d9`, and border `#dfe7f2`. Dark appearance
and readable contribution surfaces remain available.

The original globe artwork is `resources/images/community-globe.webp` (137 KB).
It was generated with the built-in image generation tool and encoded as WebP for
delivery. It is decorative artwork, not a map of members or live activity.
Pointer light, nearby connections and subtle parallax are drawn locally. The
canvas is capped at 56 points and approximately 30 frames per second, pauses off
screen/in hidden tabs, and is disabled for coarse pointers and reduced motion.
No animation library, remote tracking or user coordinates are involved.

## Original image prompt

Create an original premium website background asset for Workbine, a community for
sharing practical knowledge. Wide landscape 1536x1024 composition. A beautiful
luminous terrestrial globe made of tiny precise icy-blue and white dots,
geographic continental silhouettes recognizable, in the upper right third,
several elegant orbital arcs and delicate network connections with softly glowing
nodes around it. Sophisticated translucent atmospheric depth, silver-blue mist
and restrained warm-white glints. Bright airy pale blue-white background #edf3fc,
left half mostly empty soft atmosphere suitable for dark text overlay; bottom
half fades seamlessly to almost white. Globe occupies right 45 percent, top half,
should feel immersive, expensive, optimistic, human knowledge connecting across
the earth. Light theme, not outer-space black. Photorealistic high-end 3D digital
artwork, sharp delicate points, subtle bokeh. No text, no typography, no logos, no
UI elements, no people or avatars, no cards, no fake statistics. This is the actual
decorative artwork for a functional website, not a screenshot or UI mockup.

## Working discovery controls

- Category is optional, chosen from ten flat subjects focused on practical digital income. Topics remain independent.
- Up to three optional tags are normalized to short lowercase hyphenated names.
  Category/tag edits participate in stale-editor protection. Tags follow the same
  publication moderation path as other public topic text.
- Latest, Needs a method, Trending and Most saved use actual visible topics.
  Trending/recent activity orders by methods published plus saves from other
  members during the last 14 days. Ties use creation time and ID. Most saved uses
  the existing public save count, excluding the author. Likes do not affect these
  rankings or reputation. Newest/oldest controls order within the selected view.
- Appreciations are unique per member/topic, reversible and verified-account-only.
  Authors cannot appreciate their own topics. They send no notifications, confer
  no reputation points and expose only the count and the viewer’s own state.
- Search supports topics/method text or public member names/usernames. Email,
  authentication and private account fields are never searched or serialized.
- The guide can be hidden and restored; the preference is local to the browser.
  Empty states and starter prompts never impersonate community contributions.

Validation uses the existing disposable local gate plus real browser flows for
classification, filtering, rankings, appreciations, people search, navigation,
keyboard focus, reduced motion and pointer response. Synthetic preview content
stays in the isolated test database.

## Category scope

The owner chose AI in Practice, Automation & Agents, Coding & Apps, Products &
SaaS, Marketing & Clients, Freelancing & Services, E-commerce, Digital Products,
Content & Monetization, and Pricing & Profit. The goal is practical commercial
knowledge: what was sold, who needed it, how it was delivered, costs, results and
limitations. Category labels are English, matching the application. Tools belong
in optional tags. General health/lifestyle categories are not part of this scope.
