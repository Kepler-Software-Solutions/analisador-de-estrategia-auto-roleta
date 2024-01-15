'use server'
import crypto from 'node:crypto'

const key = Buffer.from(process.env.CRYPTOGRAPHY_SECRET_KEY!, 'hex')
const iv = Buffer.from(process.env.CRYPTOGRAPHY_SECRET_IV!, 'hex')

export async function encrypt(input: string) {
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key), iv)
  const encrypted = Buffer.concat([cipher.update(input), cipher.final()])
  return encrypted.toString('hex')
}

export async function decrypt(input: string) {
  const encryptedText = Buffer.from(input, 'hex')
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key), iv)
  const decrypted = Buffer.concat([
    decipher.update(encryptedText),
    decipher.final(),
  ])
  return decrypted.toString()
}
