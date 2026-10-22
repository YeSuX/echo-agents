import Link from "next/link"
import Image, { type StaticImageData } from "next/image"
import { ArrowRightIcon, EyeIcon, FolderOpenIcon, LayersIcon } from "lucide-react"

import { DESIGN_ASSETS } from "@/lib/design-assets"
import { ANONYMOUS_CASES } from "@/data/cases"
import styles from "@/components/landing-contact-consent.module.css"

const VIOLENCE_TYPES = [
  { title: "AI 深伪色情", description: "利用 AI 换脸等技术，未经同意将他人的形象合成为色情影像。虚假的影像，也会造成真实的伤害。", image: DESIGN_ASSETS.typeDeepfake },
  { title: "未经同意传播", description: "擅自分享、转发或公开他人的私密影像。同意拍摄，从来不等于同意传播。", image: DESIGN_ASSETS.typeSharing },
  { title: "偷拍", description: "在当事人不知情或未同意的情况下，拍摄、录制其私密部位或私密活动。", image: DESIGN_ASSETS.typeVoyeurism },
]
const CASE_IMAGES: Record<string, StaticImageData> = {
  c4: DESIGN_ASSETS.caseDeepfake,
  c5: DESIGN_ASSETS.caseCompensation,
  c6: DESIGN_ASSETS.caseTakedown,
}

export function ViolenceEducation() {
  return (
    <div id="understand" className={styles.main}>
        <section aria-labelledby="definition-heading">
          <div className={styles.sectionHeading}><EyeIcon aria-hidden="true" /><h2 id="definition-heading">什么是影像性暴力？</h2></div>
          <div className={styles.sectionBody}><p>未经同意，制作、获取、传播或威胁传播他人的私密影像。<br className="hidden sm:block" />核心是「未经同意」，无论影像真实还是合成，伤害都不该由你承担。</p><Link href="/learn" className={styles.textLink}>了解更多应对方法 <ArrowRightIcon size={16} aria-hidden="true" /></Link></div>
        </section>
        <section className={styles.contentSection} aria-labelledby="types-heading">
          <div className={styles.sectionHeading}><LayersIcon aria-hidden="true" /><h2 id="types-heading">影像性暴力的常见类型</h2></div>
          <div className={styles.threeColumns}>{VIOLENCE_TYPES.map(({ title, description, image }, index) => <article className={styles.typeCard} key={title}>
            <div className={styles.illustration}><Image src={image} alt="" width={512} height={512} sizes="(max-width: 360px) 64px, (max-width: 600px) 80px, 128px" /></div>
            <h3><span className={styles.number}>0{index + 1}</span>{title}</h3><p>{description}</p>
          </article>)}</div>
          <Link href="/learn#types" className={styles.moreTypes}>还有性勒索、造黄谣等形式，了解完整说明 <ArrowRightIcon size={15} aria-hidden="true" /></Link>
        </section>
        <section className={styles.contentSection} aria-labelledby="cases-heading">
          <div className={styles.sectionHeading}><FolderOpenIcon aria-hidden="true" /><h2 id="cases-heading">相关案例</h2></div><p className={styles.sectionIntro}>在这里，看到更多的力量</p>
          <div className={styles.threeColumns}>{ANONYMOUS_CASES.slice(3, 6).map((item, index) => {
            return <Link key={item.id} href={`/stories#${item.id}`} className={styles.caseCard}>
              <div className={styles.caseIllustration}><Image src={CASE_IMAGES[item.id]} alt="" width={512} height={512} sizes="(max-width: 360px) 64px, (max-width: 600px) 80px, 128px" /></div>
              <div className={styles.caseTitle}><span className={styles.number}>0{index + 1}</span><h3>{item.title}</h3><ArrowRightIcon className={styles.roundArrow} aria-hidden="true" /></div><p>{item.outcomeNote}</p>
            </Link>
          })}</div><p className={styles.caseNote}>匿名案例摘要，细节已脱敏。每个人的情况不同，结果仅供了解。</p>
        </section>
    </div>
  )
}
