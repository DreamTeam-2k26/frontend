export const transport = { handler: null }
export default {
  get(url, options) {
    return transport.handler(url, options)
  },
}
