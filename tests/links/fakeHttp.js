// Instância Axios falsa: registra as chamadas e responde com http.reply(url, options, body).
export const http = {
  calls: [],
  reply: () => ({ data: {} }),
}

const request =
  (method) =>
  async (url, ...args) => {
    const [body, options] = method === 'get' || method === 'delete' ? [undefined, args[0]] : args
    http.calls.push({ method, url, body, options: options ?? {} })
    return http.reply(url, options ?? {}, body)
  }

export default {
  get: request('get'),
  post: request('post'),
  patch: request('patch'),
  delete: request('delete'),
}
