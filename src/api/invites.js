import api from './api'
import { loadProjectPages } from './projectPagination'
const list = (path, params, { signal } = {}) =>
  loadProjectPages(async (page) => {
    const { data } = await api.get(path, { params: { ...params, page, page_size: 100 }, signal })
    return data
  })
export const listInvites = (project, options) => list('/invites/', { project }, options)
export const listReceivedInvites = (options) => list('/invites/received/', {}, options)
export async function findInviteUser(project, email, { signal } = {}) {
  return (await api.get('/invites/find_user/', { params: { project, email }, signal })).data
}
export async function createInvite(values) {
  return (await api.post('/invites/', values)).data
}
const respond = async (id, action) =>
  (await api.post(`/invites/${encodeURIComponent(id)}/${action}/`)).data
export const acceptInvite = (id) => respond(id, 'accept')
export const declineInvite = (id) => respond(id, 'decline')
export const revokeInvite = (id) => respond(id, 'revoke')
export const redeemInvite = async (token) => (await api.post('/invites/redeem/', { token })).data
