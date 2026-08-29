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
  clearKimiClientConfig,
  KIMI_DEFAULT_BASE_URL,
  kimiFieldsForRequest,
  normalizeKimiBaseUrl,
  readKimiClientConfig,
  writeKimiClientConfig,
} from "@/lib/kimi-client-config"

type KimiConfigContextValue = {
  openConfig: () => void
  kimiRequestFields: { kimiApiKey?: string; kimiBaseUrl?: string }
  allowClientKimiKey: boolean
}

const KimiConfigContext = createContext<KimiConfigContextValue | null>(null)

export function useKimiConfig(): KimiConfigContextValue {
  const ctx = useContext(KimiConfigContext)
  if (!ctx) {
    throw new Error("useKimiConfig must be used within KimiConfigProvider")
  }
  return ctx
}

export function KimiConfigProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [allowClientKimiKey, setAllowClientKimiKey] = useState(false)
  const [apiKey, setApiKey] = useState("")
  const [baseUrl, setBaseUrl] = useState("")
  const [draftApiKey, setDraftApiKey] = useState("")
  const [draftBaseUrl, setDraftBaseUrl] = useState("")
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void fetch("/api/config")
      .then(async (r) => (await r.json()) as { allowClientKimiKey?: boolean })
      .then((data) => {
        if (cancelled) return
        const allowed = data.allowClientKimiKey === true
        setAllowClientKimiKey(allowed)
        if (!allowed) {
          clearKimiClientConfig()
          setApiKey("")
          setBaseUrl("")
        } else {
          const c = readKimiClientConfig()
          setApiKey(c.apiKey)
          setBaseUrl(c.baseUrl)
        }
      })
      .catch(() => {
        if (!cancelled) setAllowClientKimiKey(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const openConfig = useCallback(() => {
    if (allowClientKimiKey) {
      const c = readKimiClientConfig()
      setDraftApiKey(c.apiKey)
      setDraftBaseUrl(c.baseUrl)
      setFormError(null)
    }
    setOpen(true)
  }, [allowClientKimiKey])

  const save = useCallback(() => {
    if (!allowClientKimiKey) return
    setFormError(null)
    const k = draftApiKey.trim()
    const u = draftBaseUrl.trim()
    if (u.length > 0 && normalizeKimiBaseUrl(u) === null) {
      setFormError(
        "Base URL 须为 https 地址（例如 " + KIMI_DEFAULT_BASE_URL + "）",
      )
      return
    }
    writeKimiClientConfig({ apiKey: k, baseUrl: u })
    setApiKey(k)
    setBaseUrl(u)
    setOpen(false)
  }, [allowClientKimiKey, draftApiKey, draftBaseUrl])

  const clear = useCallback(() => {
    clearKimiClientConfig()
    setDraftApiKey("")
    setDraftBaseUrl("")
    setApiKey("")
    setBaseUrl("")
    setFormError(null)
    setOpen(false)
  }, [])

  const kimiRequestFields = useMemo(
    () =>
      allowClientKimiKey ? kimiFieldsForRequest(apiKey, baseUrl) : {},
    [allowClientKimiKey, apiKey, baseUrl],
  )

  const value = useMemo<KimiConfigContextValue>(
    () => ({
      openConfig,
      kimiRequestFields,
      allowClientKimiKey,
    }),
    [openConfig, kimiRequestFields, allowClientKimiKey],
  )

  return (
    <KimiConfigContext.Provider value={value}>
      {children}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Kimi 接口配置</DialogTitle>
            <DialogDescription>
              {allowClientKimiKey
                ? "仅本地开发可用：密钥保存在浏览器 localStorage。生产环境请配置服务端环境变量 KIMI_API_KEY。"
                : "生产环境不在浏览器中保存或传输 API Key。请在部署平台配置环境变量 KIMI_API_KEY / KIMI_BASE_URL。"}
            </DialogDescription>
          </DialogHeader>
          {allowClientKimiKey ? (
            <div className="grid gap-4 py-2">
              <div className="grid gap-2">
                <Label htmlFor="kimi-api-key">KIMI_API_KEY</Label>
                <Input
                  id="kimi-api-key"
                  type="password"
                  autoComplete="off"
                  value={draftApiKey}
                  onChange={(e) => setDraftApiKey(e.target.value)}
                  placeholder="留空则使用服务端环境变量"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="kimi-base-url">KIMI_BASE_URL</Label>
                <Input
                  id="kimi-base-url"
                  type="url"
                  autoComplete="off"
                  value={draftBaseUrl}
                  onChange={(e) => setDraftBaseUrl(e.target.value)}
                  placeholder={KIMI_DEFAULT_BASE_URL}
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
            {allowClientKimiKey && (
              <>
                <Button type="button" variant="outline" onClick={clear}>
                  清除本地配置
                </Button>
                <Button type="button" onClick={save}>
                  保存
                </Button>
              </>
            )}
            {!allowClientKimiKey && (
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                关闭
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </KimiConfigContext.Provider>
  )
}

export function KimiConfigTrigger({
  className,
}: {
  className?: string
}) {
  const { allowClientKimiKey, openConfig } = useKimiConfig()
  if (!allowClientKimiKey) return null

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={className}
      onClick={openConfig}
      aria-label="Kimi 接口配置"
    >
      <Settings2Icon className="size-5" />
      <span className="hidden md:inline">接口设置</span>
    </Button>
  )
}
