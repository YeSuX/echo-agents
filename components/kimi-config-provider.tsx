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
  const [apiKey, setApiKey] = useState("")
  const [baseUrl, setBaseUrl] = useState("")
  const [draftApiKey, setDraftApiKey] = useState("")
  const [draftBaseUrl, setDraftBaseUrl] = useState("")
  const [formError, setFormError] = useState<string | null>(null)

  const hydrateFromStorage = useCallback(() => {
    const c = readKimiClientConfig()
    setApiKey(c.apiKey)
    setBaseUrl(c.baseUrl)
  }, [])

  useEffect(() => {
    hydrateFromStorage()
  }, [hydrateFromStorage])

  useEffect(() => {
    if (open) {
      const c = readKimiClientConfig()
      setDraftApiKey(c.apiKey)
      setDraftBaseUrl(c.baseUrl)
      setFormError(null)
    }
  }, [open])

  const save = useCallback(() => {
    setFormError(null)
    const k = draftApiKey.trim()
    const u = draftBaseUrl.trim()
    if (u.length > 0 && normalizeKimiBaseUrl(u) === null) {
      setFormError("Base URL 须为 https 地址（例如 " + KIMI_DEFAULT_BASE_URL + "）")
      return
    }
    writeKimiClientConfig({ apiKey: k, baseUrl: u })
    setApiKey(k)
    setBaseUrl(u)
    setOpen(false)
  }, [draftApiKey, draftBaseUrl])

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
    () => kimiFieldsForRequest(apiKey, baseUrl),
    [apiKey, baseUrl],
  )

  const value = useMemo<KimiConfigContextValue>(
    () => ({
      openConfig: () => setOpen(true),
      kimiRequestFields,
    }),
    [kimiRequestFields],
  )

  return (
    <KimiConfigContext.Provider value={value}>
      {children}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Kimi 接口配置</DialogTitle>
            <DialogDescription>
              保存在本机浏览器（localStorage）。留空则使用服务端环境变量
              KIMI_API_KEY / KIMI_BASE_URL。
            </DialogDescription>
          </DialogHeader>
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
          <Separator />
          <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={clear}>
              清除本地配置
            </Button>
            <Button type="button" onClick={save}>
              保存
            </Button>
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
  const { openConfig } = useKimiConfig()
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={className}
      onClick={openConfig}
      aria-label="Kimi 接口配置"
    >
      <Settings2Icon className="size-5" />
    </Button>
  )
}
