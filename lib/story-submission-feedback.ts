// Keep transport details and server-provided text out of the public dialog.
export function storySubmissionError(status: number, retryAfter: string | null): string {
  if (status === 429) {
    const seconds = Number(retryAfter)
    return Number.isFinite(seconds) && seconds > 0
      ? `提交较频繁，请在 ${Math.ceil(seconds / 60)} 分钟后重试。草稿已保留。`
      : "提交较频繁，请稍后重试。草稿已保留。"
  }
  if (status === 413) return "内容过长，请缩短后重试。草稿已保留。"
  if (status === 409) return "这份草稿的提交编号已用于其他内容。请修改草稿后重新提交。"
  if (status === 400) return "请检查内容长度并重新确认授权后提交。草稿已保留。"
  return "暂时无法提交，请稍后重试。草稿已保留。"
}
