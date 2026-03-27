import Link from "next/link"

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="text-2xl font-semibold">隐私承诺：安全、尊重与集体的力量</h1>
      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
        在这里，你的安全是第一位的。这份约定旨在告诉你：我们如何保护你，以及我们如何聚沙成塔，共同反抗影像性暴力。
      </p>

      <section className="mt-8 space-y-6 text-sm leading-relaxed">
        <div>
          <h2 className="text-lg font-medium">1. 默认「不留痕」，除非你决定发声</h2>
          <p className="mt-2 text-muted-foreground">
            你的隐私由你掌控。
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
            <li>
              <strong>隐私模式（默认）</strong>：除非你主动授权，否则系统不会存储你的对话信息。一旦关闭网页或结束会话，数据将从临时内存中抹除。
            </li>
            <li>
              <strong>故事留存（可选）</strong>：如果你愿意将经历留给我们，用于协助我们监测此类事件的趋势、推动法律改进或进行公益倡导，你可以选择授权存储。你的痛苦不应被遗忘，它可以化作改变世界的力量。
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-medium">2. 自动「面纱」：你的真实身份会被隐藏</h2>
          <p className="mt-2 text-muted-foreground">
            即便你选择留下故事，AI 也会在第一时间为你戴上「面纱」。
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
            <li>
              <strong>实时脱敏</strong>：系统内置了识别引擎，当它检测到姓名、手机号、具体社交账号、URL链接时，会将其替换为 [已隐藏]。
            </li>
            <li>
              <strong>脱敏示例</strong>：你的原话 &quot;我在 [网址] 看到对方留了我的电话 138...&quot; 会被存为 &quot;我在 [已隐藏] 看到对方留了我的电话 [已隐藏]...&quot;。
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-medium">3. 数据处理与安全边界</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
            <li>
              <strong>传输加密</strong>：我们采用标准的工业级传输加密技术（SSL/HTTPS），确保你的信息在发送到我们服务器的过程中不会被截获。
            </li>
            <li>
              <strong>用途限制</strong>：留存的数据仅限用于影像性暴力监测与政策倡导，绝不用于商业分析、画像建模或交给任何非法律/公益背景的第三方。
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-medium">4. 你随时可以「反悔」</h2>
          <p className="mt-2 text-muted-foreground">
            如果你之前分享了故事，但现在感到不安，你可以随时联系我们或通过设置撤回授权。你对自己的经历拥有永久的「撤回权」。
          </p>
        </div>

        <div className="rounded-lg border bg-muted/30 p-4">
          <p className="text-muted-foreground">
            每一个留在这里的故事，都是反击影像性暴力的证据。我们收集这些信息，是为了告诉社会：这些伤害正在发生，且必须停止。如果你还没准备好，请放心地使用隐私模式；如果你准备好了，你的勇敢将帮助到更多的人。
          </p>
        </div>
      </section>

      <Link
        href="/"
        className="mt-8 inline-block text-sm text-primary underline-offset-4 hover:underline"
      >
        返回首页
      </Link>
    </div>
  )
}
