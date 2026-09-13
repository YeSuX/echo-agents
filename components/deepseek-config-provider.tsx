"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"
import { Settings2Icon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  clearDeepSeekClientConfig,
  DEEPSEEK_DEFAULT_BASE_URL,
  deepseekFieldsForRequest,
  normalizeDeepSeekBaseUrl,
  readDeepSeekClientConfig,
  writeDeepSeekClientConfig,
} from "@/lib/deepseek-client-config"

type DeepSeekConfigContextValue = {
  openConfig: () => void
  deepseekRequestFields: { deepseekApiKey?: string; deepseekBaseUrl?: string }
  allowClientDeepSeekKey: boolean
}

const DeepSeekConfigContext = createContext<DeepSeekConfigContextValue | null>(null)

export function useDeepSeekConfig(): DeepSeekConfigContextValue {
  const ctx = useContext(DeepSeekConfigContext)
  if (!ctx) {
    throw new Error("useDeepSeekConfig must be used within DeepSeekConfigProvider")
  }
  return ctx
}

export function DeepSeekConfigProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [allowClientDeepSeekKey, setAllowClientDeepSeekKey] = useState(false)
  const [apiKey, setApiKey] = useState("")
  const [baseUrl, setBaseUrl] = useState("")
  const [draftApiKey, setDraftApiKey] = useState("")
  const [draftBaseUrl, setDraftBaseUrl] = useState("")
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void fetch("/api/config")
      .then(async (r) => (await r.json()) as { allowClientDeepSeekKey?: boolean })
      .then((data) => {
        if (cancelled) return
        const allowed = data.allowClientDeepSeekKey === true
        setAllowClientDeepSeekKey(allowed)
        if (!allowed) {
          clearDeepSeekClientConfig()
          setApiKey("")
          setBaseUrl("")
        } else {
          const c = readDeepSeekClientConfig()
          setApiKey(c.apiKey)
          setBaseUrl(c.baseUrl)
        }
      })
      .catch(() => {
        if (!cancelled) setAllowClientDeepSeekKey(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const openConfig = useCallback(() => {
    if (allowClientDeepSeekKey) {
      const c = readDeepSeekClientConfig()
      setDraftApiKey(c.apiKey)
      setDraftBaseUrl(c.baseUrl)
      setFormError(null)
    }
    setOpen(true)
  }, [allowClientDeepSeekKey])

  const save = useCallback(() => {
    if (!allowClientDeepSeekKey) return
    setFormError(null)
    const k = draftApiKey.trim()
    const u = draftBaseUrl.trim()
    if (u.length > 0 && normalizeDeepSeekBaseUrl(u) === null) {
      setFormError(
        "Base URL 须为 https 地址（例如 " + DEEPSEEK_DEFAULT_BASE_URL + "）",
      )
      return
    }
    writeDeepSeekClientConfig({ apiKey: k, baseUrl: u })
    setApiKey(k)
    setBaseUrl(u)
    setOpen(false)
  }, [allowClientDeepSeekKey, draftApiKey, draftBaseUrl])

  const clear = useCallback(() => {
    clearDeepSeekClientConfig()
    setDraftApiKey("")
    setDraftBaseUrl("")
    setApiKey("")
    setBaseUrl("")
    setFormError(null)
    setOpen(false)
  }, [])

  const deepseekRequestFields = useMemo(
    () =>
      allowClientDeepSeekKey ? deepseekFieldsForRequest(apiKey, baseUrl) : {},
    [allowClientDeepSeekKey, apiKey, baseUrl],
  )

  const value = useMemo<DeepSeekConfigContextValue>(
    () => ({
      openConfig,
      deepseekRequestFields,
      allowClientDeepSeekKey,
    }),
    [openConfig, deepseekRequestFields, allowClientDeepSeekKey],
  )

  return (
    <DeepSeekConfigContext.Provider value={value}>
      {children}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>DeepSeek 接口配置</DialogTitle>
            <DialogDescription>
              {allowClientDeepSeekKey
                ? "仅本地开发可用：密钥保存在浏览器 localStorage。生产环境请配置服务端环境变量 DEEPSEEK_API_KEY。"
                : "生产环境不在浏览器中保存或传输 API Key。请在部署平台配置环境变量 DEEPSEEK_API_KEY / DEEPSEEK_BASE_URL。"}
            </DialogDescription>
          </DialogHeader>
          {allowClientDeepSeekKey ? (
            <div className="grid gap-4 py-2">
              <div className="grid gap-2">
                <Label htmlFor="deepseek-api-key">DEEPSEEK_API_KEY</Label>
                <Input
                  id="deepseek-api-key"
                  type="password"
                  autoComplete="off"
                  value={draftApiKey}
                  onChange={(e) => setDraftApiKey(e.target.value)}
                  placeholder="留空则使用服务端环境变量"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="deepseek-base-url">DEEPSEEK_BASE_URL</Label>
                <Input
                  id="deepseek-base-url"
                  type="url"
                  autoComplete="off"
                  value={draftBaseUrl}
                  onChange={(e) => setDraftBaseUrl(e.target.value)}
                  placeholder={DEEPSEEK_DEFAULT_BASE_URL}
                />
              </div>
              {formError && (
                <p className="text-sm text-destructive" role="alert">
                  {formError}
                </p>
              )}
            </div>
          ) : (
            <p className="py-2 text-sm text-muted-foreground">
              当前环境已禁用客户端 API Key，对话请求将仅使用服务端配置。
            </p>
          )}
          <Separator />
          <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-end">
            {allowClientDeepSeekKey && (
              <>
                <Button type="button" variant="outline" onClick={clear}>
                  清除本地配置
                </Button>
                <Button type="button" onClick={save}>
                  保存
                </Button>
              </>
            )}
            {!allowClientDeepSeekKey && (
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                关闭
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DeepSeekConfigContext.Provider>
  )
}

export function DeepSeekConfigTrigger({
  className,
}: {
  className?: string
}) {
  const { allowClientDeepSeekKey, openConfig } = useDeepSeekConfig()
  if (!allowClientDeepSeekKey) return null

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={className}
      onClick={openConfig}
      aria-label="DeepSeek 接口配置"
    >
      <Settings2Icon className="size-5" />
      <span className="hidden md:inline">接口设置</span>
    </Button>
  )
}
