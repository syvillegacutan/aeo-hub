import { useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { useClients } from '../hooks/useClients'
import AddClientModal from './AddClientModal'

const FIELD = 'bg-[#0D1117] border border-[#30363D] focus:border-[#1D9E75] rounded-lg px-3.5 py-2.5 text-sm text-[#C9D1D9] placeholder-[#6E7681] outline-none transition-colors w-full'
const LABEL = 'block text-xs font-semibold text-[#8B949E] uppercase tracking-wider mb-1.5'

function initials(name) {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export default function Sidebar() {
  const { clientId } = useParams()
  const navigate = useNavigate()
  const { clients, newCounts, loading, addClient, updateClient, deleteClient, refetch } = useClients()
  const [showAdd, setShowAdd] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [editForm, setEditForm] = useState({ name: '', location: '', niche: '', website: '' })
  const [editSaving, setEditSaving] = useState(false)

  function openEdit(client) {
    setEditForm({ name: client.name, location: client.location || '', niche: client.niche || '', website: client.website || '' })
    setEditTarget(client)
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteClient(deleteTarget.id)
      if (clientId === deleteTarget.id) navigate('/')
    } catch (err) {
      alert('Failed to delete client: ' + err.message)
    } finally {
      setDeleting(false)
      setDeleteTarget(null)
    }
  }

  async function handleEditSave(e) {
    e.preventDefault()
    if (!editTarget || !editForm.name.trim()) return
    setEditSaving(true)
    try {
      await updateClient(editTarget.id, editForm)
      setEditTarget(null)
    } catch (err) {
      alert('Failed to update client: ' + err.message)
    } finally {
      setEditSaving(false)
    }
  }

  return (
    <>
      <aside className="w-64 flex-shrink-0 flex flex-col h-full bg-[#0D1117] border-r border-[#1C2333]">
        {/* Brand */}
        <div className="px-5 py-4 border-b border-[#1C2333] flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#1D9E75] flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
            </svg>
          </div>
          <div>
            <p className="text-white font-semibold text-sm leading-tight">AEO Hub</p>
            <p className="text-[#6E7681] text-xs">Answer Engine Optimizer</p>
          </div>
        </div>

        {/* Client list */}
        <div className="flex-1 overflow-y-auto pt-4 pb-2">
          <p className="px-5 mb-2 text-[10px] font-semibold tracking-widest text-[#6E7681] uppercase">
            Clients
          </p>

          {loading && (
            <div className="px-5 py-2 text-[#6E7681] text-sm">Loading…</div>
          )}

          {!loading && clients.length === 0 && (
            <div className="px-5 py-6 text-center">
              <p className="text-[#6E7681] text-sm">No clients yet.</p>
              <p className="text-[#6E7681] text-xs mt-1">Add one below to get started.</p>
            </div>
          )}

          {clients.map((client) => {
            const isActive = clientId === client.id
            const count = newCounts[client.id] || 0
            return (
              <Link
                key={client.id}
                to={`/client/${client.id}`}
                className={`flex items-center gap-3 mx-2 px-3 py-2.5 rounded-lg mb-0.5 transition-all group ${
                  isActive
                    ? 'bg-[#1D9E75]/15 border border-[#1D9E75]/25'
                    : 'hover:bg-[#161B22] border border-transparent'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 transition-colors ${
                    isActive
                      ? 'bg-[#1D9E75] text-white'
                      : 'bg-[#1C2333] text-[#8B949E] group-hover:bg-[#21262D]'
                  }`}
                >
                  {initials(client.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate leading-tight ${isActive ? 'text-white' : 'text-[#C9D1D9]'}`}>
                    {client.name}
                  </p>
                  <p className="text-[11px] text-[#6E7681] truncate mt-0.5">
                    {client.niche || 'No niche'}
                  </p>
                </div>

                {/* Right side: badge (non-hover) / action icons (hover) */}
                <div className="flex-shrink-0 flex items-center justify-end">
                  {count > 0 && (
                    <span className="group-hover:hidden min-w-[20px] h-5 px-1.5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                      {count > 99 ? '99+' : count}
                    </span>
                  )}
                  <div className="hidden group-hover:flex items-center gap-0.5">
                    <button
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); openEdit(client) }}
                      className="p-1 rounded text-[#6E7681] hover:text-white hover:bg-[#21262D] transition-colors"
                      title="Edit client"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                      </svg>
                    </button>
                    <button
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDeleteTarget(client) }}
                      className="p-1 rounded text-[#6E7681] hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      title="Delete client"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                    </button>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>

        {/* Add Client */}
        <div className="p-4 border-t border-[#1C2333]">
          <button
            onClick={() => setShowAdd(true)}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium text-white bg-[#1D9E75] hover:bg-[#179967] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add Client
          </button>
        </div>
      </aside>

      {/* Add Client modal */}
      {showAdd && (
        <AddClientModal
          addClient={addClient}
          onClose={() => { setShowAdd(false); refetch() }}
        />
      )}

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-[#161B22] border border-[#30363D] rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-6">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
                <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </div>
              <h2 className="text-white font-semibold mb-2">Delete {deleteTarget.name}?</h2>
              <p className="text-[#8B949E] text-sm leading-relaxed">
                This will permanently delete all their questions, keywords, credentials and notes. This cannot be undone.
              </p>
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-lg text-sm font-medium text-[#8B949E] hover:text-white bg-[#21262D] hover:bg-[#30363D] transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-lg text-sm font-medium text-white bg-red-600 hover:bg-red-500 transition-colors disabled:opacity-50"
              >
                {deleting ? 'Deleting…' : 'Delete permanently'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit client modal */}
      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#161B22] border border-[#30363D] rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#21262D]">
              <div>
                <h2 className="text-white font-semibold">Edit Client</h2>
                <p className="text-[#6E7681] text-xs mt-0.5">{editTarget.name}</p>
              </div>
              <button
                onClick={() => setEditTarget(null)}
                className="text-[#6E7681] hover:text-white transition-colors p-1"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleEditSave} className="p-6 space-y-4">
              <div>
                <label className={LABEL}>Business Name *</label>
                <input
                  required
                  type="text"
                  className={FIELD}
                  placeholder="e.g. Acme Roofing Co."
                  value={editForm.name}
                  onChange={(e) => setEditForm(f => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={LABEL}>Location</label>
                  <input
                    type="text"
                    className={FIELD}
                    placeholder="e.g. Austin, TX"
                    value={editForm.location}
                    onChange={(e) => setEditForm(f => ({ ...f, location: e.target.value }))}
                  />
                </div>
                <div>
                  <label className={LABEL}>Niche / Industry</label>
                  <input
                    type="text"
                    className={FIELD}
                    placeholder="e.g. Roofing"
                    value={editForm.niche}
                    onChange={(e) => setEditForm(f => ({ ...f, niche: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <label className={LABEL}>Website</label>
                <input
                  type="url"
                  className={FIELD}
                  placeholder="https://example.com"
                  value={editForm.website}
                  onChange={(e) => setEditForm(f => ({ ...f, website: e.target.value }))}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditTarget(null)}
                  className="flex-1 py-2.5 rounded-lg text-sm font-medium text-[#8B949E] hover:text-white bg-[#21262D] hover:bg-[#30363D] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSaving}
                  className="flex-1 py-2.5 rounded-lg text-sm font-medium text-white bg-[#1D9E75] hover:bg-[#179967] disabled:opacity-60 transition-colors"
                >
                  {editSaving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
