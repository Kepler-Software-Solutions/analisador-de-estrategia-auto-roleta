type Callback<T> = (data: T) => void

type WaitForEventProps<T> = {
  name: string
  timeout: number
  trigger?: () => void
  condition?: (data: T) => boolean
  persist?: boolean
}

export const useEvent = () => {
  const pool = new Map<string, Callback<any>>()

  function addEventListener<T>(name: string, callback: Callback<T>): void {
    pool.set(name, callback)
  }

  function removeEventListener(name: string): void {
    pool.delete(name)
  }

  function listen<T>(name: string, data: T): void {
    if (pool.has(name)) {
      pool.get(name)!(data)
    }
  }

  async function waitForEvent<T>({
    name,
    timeout,
    trigger,
    condition,
    persist = false,
  }: WaitForEventProps<T>): Promise<T | null> {
    return await new Promise((resolve) => {
      const id = setTimeout(() => {
        resolve(null)
        removeEventListener(name)
      }, timeout)

      addEventListener<T>(name, (data) => {
        if (condition && !condition(data)) {
          return
        }

        clearTimeout(id)
        resolve(data)

        if (!persist) {
          removeEventListener(name)
        }
      })

      if (trigger) {
        trigger()
      }
    })
  }

  return { pool, addEventListener, removeEventListener, listen, waitForEvent }
}
