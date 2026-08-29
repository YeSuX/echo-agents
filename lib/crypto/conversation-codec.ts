const KEY_VERSION = 1
const IV_BYTES = 12

export type EncryptedContent = {
  ciphertext: Uint8Array
  iv: Uint8Array
  keyVersion: number
}

export type ConversationKeyring = ReadonlyMap<number, string>

function exactArrayBuffer(value: ArrayBuffer | Uint8Array): ArrayBuffer {
  if (value instanceof ArrayBuffer) return value
  return value.buffer.slice(
    value.byteOffset,
    value.byteOffset + value.byteLength,
  ) as ArrayBuffer
}

function decodeBase64(value: string): ArrayBuffer {
  const normalized = value.trim()
  const binary = atob(normalized)
  const bytes = new Uint8Array(new ArrayBuffer(binary.length))
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  return bytes.buffer
}

function additionalData(
  conversationId: string,
  turnId: string,
  role: "user" | "assistant",
  keyVersion: number,
): ArrayBuffer {
  return exactArrayBuffer(new TextEncoder().encode(
    `${conversationId}:${turnId}:${role}:${keyVersion}`,
  ))
}

async function importKey(encodedKey: string): Promise<CryptoKey> {
  const raw = decodeBase64(encodedKey)
  if (raw.byteLength !== 32) {
    throw new Error("Conversation encryption key must contain 32 bytes")
  }
  return crypto.subtle.importKey("raw", raw, "AES-GCM", false, [
    "encrypt",
    "decrypt",
  ])
}

export function conversationKeyringFromEnv(): ConversationKeyring {
  const encodedKey = process.env.CONVERSATION_ENCRYPTION_KEY_V1
  if (!encodedKey) {
    throw new Error("CONVERSATION_ENCRYPTION_KEY_V1 is not configured")
  }
  return new Map([[KEY_VERSION, encodedKey]])
}

export async function encryptConversationContent(
  plaintext: string,
  options: {
    conversationId: string
    turnId: string
    role: "user" | "assistant"
    keyring: ConversationKeyring
    keyVersion?: number
  },
): Promise<EncryptedContent> {
  const keyVersion = options.keyVersion ?? KEY_VERSION
  const encodedKey = options.keyring.get(keyVersion)
  if (!encodedKey) throw new Error(`Unknown encryption key version ${keyVersion}`)

  const key = await importKey(encodedKey)
  const iv = crypto.getRandomValues(new Uint8Array(new ArrayBuffer(IV_BYTES)))
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: exactArrayBuffer(iv),
      additionalData: additionalData(
        options.conversationId,
        options.turnId,
        options.role,
        keyVersion,
      ),
    },
    key,
    exactArrayBuffer(new TextEncoder().encode(plaintext)),
  )

  return { ciphertext: new Uint8Array(ciphertext), iv, keyVersion }
}

export async function decryptConversationContent(
  encrypted: { ciphertext: ArrayBuffer | Uint8Array; iv: ArrayBuffer | Uint8Array },
  options: {
    conversationId: string
    turnId: string
    role: "user" | "assistant"
    keyVersion: number
    keyring: ConversationKeyring
  },
): Promise<string> {
  const encodedKey = options.keyring.get(options.keyVersion)
  if (!encodedKey) {
    throw new Error(`Unknown encryption key version ${options.keyVersion}`)
  }
  const key = await importKey(encodedKey)
  const plaintext = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: exactArrayBuffer(encrypted.iv),
      additionalData: additionalData(
        options.conversationId,
        options.turnId,
        options.role,
        options.keyVersion,
      ),
    },
    key,
    exactArrayBuffer(encrypted.ciphertext),
  )
  return new TextDecoder().decode(plaintext)
}
