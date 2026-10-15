# 首页概念图素材

参考：[Figma 206:89](https://www.figma.com/design/kS71785BD8Bj6wnh4tI0A7/?node-id=206-89)。2026-10-10 通过浏览器查看概念图。提取浅薰衣草紫、奶油白、暖桃色、逆光侧脸和轻纱的视觉特征；未将概念图整体作为页面截图使用。

## 生成方式与文件

使用内置 imagegen 工具。人物为生成的虚构人物，作为装饰性背景；原有头像、嘉宾资料和案例插画保留。

| 用途 | 生成源文件 | 网页素材 |
| --- | --- | --- |
| 首屏背景 | `public/design/generated/home-hero-v2.png` | `public/design/optimized/home-hero-v2.webp` |
| 自愿分享插画 | `public/design/generated/story-envelope-v1.png` | `public/design/optimized/story-envelope-v1.webp` |

运行 `bun run assets:design` 可从源文件重新生成 WebP。素材通过静态导入获得内容哈希地址。首屏优先加载，分享插画延迟加载；旧的 `hero-portrait.png/webp` 继续保留。

## 首屏初版生成提示词

```text
Use case: stylized-concept
Asset type: production website hero background, landscape 3:2, high resolution.
Reference image: the most recent Figma canvas screenshot is visual style and atmosphere reference ONLY. Generate original artwork, NOT a screenshot, NOT a UI mockup. Deliver one edge-to-edge background image without any text, logos, buttons, cards, frames, icons or UI.
Primary request: a tranquil, luminous editorial photographic artwork for a Chinese emotional-support website. Soft side profile of one anonymous adult woman facing right, eyes gently closed, backlit by warm cream/peach light. Her head and shoulders should occupy the center-right of the composition (head center around 62% width, 38% height). Natural human anatomy, face in subtle silhouette, dignified and calm. Light translucent organza drifts across the shoulders and bottom like soft flowing ribbons.
Palette: muted lavender #c4b4d9, dusty lilac #a798c4, pale blush #efdadc, buttery ivory #fff2de. Lavender haze on the left blending into warm ivory on the right. Low saturation, soft grain, delicate film bloom, dreamy photographic double-exposure feeling, no harsh detail.
Composition: the LEFT 43% is quiet pale lavender negative space for dark purple headline and buttons, no prominent facial features there. Keep upper-left evenly light so dark typography remains legible. Luminous woman central/right, flowing gauze across the lower edge. Right edge fades into near-white warm cream to blend with a neighboring white safety panel. Atmospheric and layered, avoid dark edges.
Avoid: text, typography, watermark, UI, border, collage, extra people, flowers, distress, bruising, sexualization, dramatic darkness, oversaturated purple.
```

## 信封生成提示词

```text
Use case: stylized-concept
Asset type: small decorative illustration for a voluntary story-sharing card on an emotional-support website.
Primary request: one elegant open pale lavender paper envelope with a cream letter inside and a small plum-purple dimensional heart on the letter; two tiny softly translucent heart shapes floating just above it. A polished soft 3D paper-clay illustration, rounded paper folds, subtle shadows, reassuring and quiet.
Palette: lavender #c3a6e0, pale lilac #eee5f7, warm white #fffaf4, muted deep purple #8155a4. Match the airy lilac/cream atmosphere of the supplied Figma concept reference.
Composition: square canvas, envelope slightly tilted, centered with generous clean margins, envelope occupies lower-middle 65%. Object isolated on a flat very pale lilac #f7f0fc background, diffuse lighting, delicate contact shadow.
Constraints: no readable text, no letters, no logos, no watermark, no border, no UI, no people.
```

## 2026-10-13 构图修正

根据反馈，使用内置 imagegen 编辑 v1：人物移至左半边，保持向右的侧脸和原有紫色/暖桃色柔光；右侧约一半留白给信息面板。当前页面采用 `home-hero-v2.png` 及其 WebP，v1 保留作对照。背景覆盖整个首屏，桌面左对齐裁切；窄屏采用偏左的裁切位置并将安全面板移至下方。

网页背景为 1672 × 940，压缩后约 56 KB；信封插画为 640 × 640，约 11 KB。

### 最终编辑提示词

```text
Use case: precise-object-edit
Edit target: the provided existing website hero background.
Primary change: MOVE the woman decisively to the LEFT half of the image, so the website's separate information panel can occupy the RIGHT half. This is a composition correction requested by the designer. Do not merely mirror the existing image. Keep her profile facing RIGHT toward the empty space.
Composition: wide landscape 16:9. Center of the woman's head at approximately x=35% of the total canvas width, y=35%; the front of her face ends before x=48%. Her shoulders and gauze remain in the left half and lower left. The RIGHT 48% of the canvas must be mostly calm, very pale warm ivory and blush negative space with no human features, no large objects, and only a hint of flowing translucent fabric along the bottom. Maintain some soft lavender space on the far left so a headline overlay stays legible.
Preserve: the same adult woman, recognizable facial profile, gently closed eyes, dignified calm mood, translucent organza, delicate light rays and photographic grain. Preserve the existing low-saturation lavender, pale lilac, warm peach, cream color palette, luminous soft backlighting, airy and reassuring atmosphere. Keep the subject softly defined so dark purple page text can overlap the left portion.
Only change composition/placement and extend/reconstruct the softly blended background as needed. Do NOT change this into a different image style. No text, typography, letters, buttons, icons, cards, UI, borders, logos or watermarks. One continuous background image.
```

## 验证记录（2026-10-15 完成）

- TypeScript 与修改文件的 ESLint 检查通过；`git diff --check` 通过。
- `ALLOW_CLERK_TEST_KEYS=1 next build --webpack` 本地生产构建通过，20 个页面正常生成。该开关仅用于本次本地验证，没有修改项目的生产密钥校验规则。
- 浏览器已检查桌面、390px 与 320px 布局，未出现水平溢出；所有首页图片加载正常。窄屏品牌名称保持横排，信封插画边缘使用渐隐融入卡片背景。
- 支持资源可展开和收起；隐私弹窗可打开、关闭；分享入口可打开现有草稿审阅窗口，未同意且内容为空时提交按钮禁用；寻求帮助可进入 `/support`。
- 验证范围为图片、首页布局、导航与本地交互；没有发送真实聊天请求、提交故事或部署网站。
