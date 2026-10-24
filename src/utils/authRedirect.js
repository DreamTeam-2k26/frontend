export function authDestination(redirect) {
  return typeof redirect === 'string' && /^\/(?![/\\])/.test(redirect) && !/[\r\n]/.test(redirect)
    ? redirect
    : { name: 'home' }
}
export function authQuery(redirect) {
  const destination = authDestination(redirect)
  return typeof destination === 'string' ? { redirect: destination } : {}
}
