import {
  AlertCircle,
  Eye,
  LoaderCircle,
  Pencil,
  Plus,
  Search,
  Trash2,
  UsersRound,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import CustomerDetailsDialog from '../components/CustomerDetailsDialog.jsx'
import CustomerFormDialog from '../components/CustomerFormDialog.jsx'
import { useAuth } from '../hooks/useAuth.js'
import DashboardLayout from '../layouts/DashboardLayout.jsx'
import { getBusiness } from '../services/businessService.js'
import {
  createCustomer,
  deleteCustomer,
  getCustomer,
  getCustomers,
  updateCustomer,
} from '../services/customerService.js'
import { getApiErrorMessage } from '../utils/getApiErrorMessage.js'

function Customers() {
  const { user } = useAuth()
  const [businessName, setBusinessName] = useState('')
  const [businessError, setBusinessError] = useState('')
  const [customers, setCustomers] = useState([])
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [listError, setListError] = useState('')
  const [notice, setNotice] = useState('')
  const [reloadVersion, setReloadVersion] = useState(0)
  const [dialog, setDialog] = useState(null)
  const [customerToDelete, setCustomerToDelete] = useState(null)
  const [deleteError, setDeleteError] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    let active = true

    const loadBusiness = async () => {
      try {
        const business = await getBusiness(user.business_id)
        if (active) {
          setBusinessName(business.business_name)
          setBusinessError('')
        }
      } catch (error) {
        if (active) {
          setBusinessName('')
          setBusinessError(
            getApiErrorMessage(error, 'Could not load your business details.'),
          )
        }
      }
    }

    void loadBusiness()
    return () => {
      active = false
    }
  }, [user.business_id])

  useEffect(() => {
    let active = true

    const loadCustomers = async () => {
      try {
        const result = await getCustomers()
        if (active) {
          setCustomers(
            result.filter((customer) => customer.business_id === user.business_id),
          )
          setListError('')
        }
      } catch (error) {
        if (active) {
          setListError(
            getApiErrorMessage(error, 'Could not load customers. Please try again.'),
          )
        }
      } finally {
        if (active) {
          setIsLoading(false)
        }
      }
    }

    void loadCustomers()
    return () => {
      active = false
    }
  }, [reloadVersion, user.business_id])

  const filteredCustomers = useMemo(() => {
    const query = search.trim().toLocaleLowerCase()
    if (!query) {
      return customers
    }

    return customers.filter((customer) =>
      `${customer.name} ${customer.phone_number}`
        .toLocaleLowerCase()
        .includes(query),
    )
  }, [customers, search])

  const refreshCustomers = () => {
    setIsLoading(true)
    setReloadVersion((version) => version + 1)
  }

  const openAddCustomer = () => {
    setNotice('')
    setDialog({ type: 'form', mode: 'create', customer: null })
  }

  const openCustomer = async (customerId, mode) => {
    setNotice('')
    setListError('')
    setDialog({ type: 'loading' })

    try {
      const customer = await getCustomer(customerId)
      if (customer.business_id !== user.business_id) {
        throw new Error('Customer not found.')
      }

      if (mode === 'view') {
        setDialog({ type: 'details', customer })
      } else {
        setDialog({ type: 'form', mode: 'edit', customer })
      }
    } catch (error) {
      setDialog(null)
      setListError(getApiErrorMessage(error, 'Could not load this customer.'))
    }
  }

  const saveCustomer = async (customerData) => {
    if (dialog.mode === 'edit') {
      await updateCustomer(dialog.customer.id, customerData)
      setNotice('Customer updated successfully.')
    } else {
      await createCustomer(customerData)
      setNotice('Customer added successfully.')
    }

    setDialog(null)
    refreshCustomers()
  }

  const confirmDelete = async () => {
    if (!customerToDelete) {
      return
    }

    setIsDeleting(true)
    setDeleteError('')
    try {
      await deleteCustomer(customerToDelete.id)
      setNotice('Customer deleted successfully.')
      setCustomerToDelete(null)
      refreshCustomers()
    } catch (error) {
      setDeleteError(
        getApiErrorMessage(error, 'Could not delete this customer. Please try again.'),
      )
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <DashboardLayout
      activeItem="Customers"
      businessName={businessName || 'Your business'}
    >
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-800">
              Business directory
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[#17211d] sm:text-[28px]">
              Customers
            </h1>
            <p className="mt-1 text-sm text-[#748078]">
              Manage the customers associated with your business.
            </p>
          </div>
          <button
            className="inline-flex h-10 items-center justify-center gap-2 self-start rounded-xl bg-[#123c32] px-4 text-sm font-semibold text-white transition hover:bg-[#0d3028] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 sm:self-auto"
            onClick={openAddCustomer}
            type="button"
          >
            <Plus aria-hidden="true" size={17} />
            Add Customer
          </button>
        </div>

        {businessError && (
          <p
            className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
            role="alert"
          >
            {businessError}
          </p>
        )}
        {notice && (
          <div
            className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
            role="status"
          >
            {notice}
          </div>
        )}
        {listError && (
          <div className="flex flex-col gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-start gap-2" role="alert">
              <AlertCircle aria-hidden="true" className="mt-0.5 shrink-0" size={17} />
              {listError}
            </p>
            {!isLoading && (
              <button
                className="self-start font-semibold text-rose-900 underline underline-offset-2 sm:self-auto"
                onClick={refreshCustomers}
                type="button"
              >
                Retry
              </button>
            )}
          </div>
        )}

        <section
          aria-label="Customer list"
          className="overflow-hidden rounded-2xl border border-[#e7ebe6] bg-white shadow-[0_4px_18px_rgba(34,53,42,0.025)]"
        >
          <div className="flex flex-col gap-4 border-b border-[#edf0ec] p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-[#edf4ee] text-emerald-800">
                <UsersRound aria-hidden="true" size={19} />
              </span>
              <div>
                <p className="text-sm font-semibold text-[#27352e]">
                  All customers
                </p>
                <p className="mt-0.5 text-xs text-[#89938d]">
                  {customers.length} {customers.length === 1 ? 'customer' : 'customers'}
                </p>
              </div>
            </div>
            <label className="relative block w-full sm:max-w-xs">
              <span className="sr-only">Search customers by name or phone</span>
              <Search
                aria-hidden="true"
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#89938d]"
                size={17}
              />
              <input
                className="h-10 w-full rounded-xl border border-[#dfe5df] bg-white pl-9 pr-3 text-sm outline-none placeholder:text-[#9aa39e] focus:border-emerald-700 focus:ring-4 focus:ring-emerald-700/10"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search name or phone"
                type="search"
                value={search}
              />
            </label>
          </div>

          {isLoading ? (
            <div
              aria-label="Loading customers"
              className="flex min-h-64 items-center justify-center text-emerald-800"
              role="status"
            >
              <LoaderCircle aria-hidden="true" className="animate-spin" size={27} />
              <span className="ml-3 text-sm text-[#748078]">Loading customers…</span>
            </div>
          ) : listError ? (
            <div className="min-h-32" />
          ) : customers.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center px-5 py-10 text-center">
              <span className="flex size-12 items-center justify-center rounded-2xl bg-[#f3f6f3] text-[#7b8580]">
                <UsersRound aria-hidden="true" size={22} />
              </span>
              <h2 className="mt-4 text-sm font-semibold text-[#27352e]">
                No customers yet
              </h2>
              <p className="mt-1 max-w-sm text-sm text-[#7b8580]">
                Add your first customer to start building your business directory.
              </p>
              <button
                className="mt-4 text-sm font-semibold text-emerald-800 hover:text-emerald-950"
                onClick={openAddCustomer}
                type="button"
              >
                Add a customer
              </button>
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="flex min-h-56 flex-col items-center justify-center px-5 py-10 text-center">
              <Search aria-hidden="true" className="text-[#9aa39e]" size={23} />
              <h2 className="mt-3 text-sm font-semibold text-[#27352e]">
                No matching customers
              </h2>
              <p className="mt-1 text-sm text-[#7b8580]">
                Try a different name or phone number.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[780px] text-left text-sm">
                <thead>
                  <tr className="border-b border-[#edf0ec] bg-[#fbfcfb] text-[11px] font-semibold uppercase tracking-wide text-[#89938d]">
                    <th className="px-5 py-3.5 font-semibold">Customer name</th>
                    <th className="px-5 py-3.5 font-semibold">Phone number</th>
                    <th className="px-5 py-3.5 font-semibold">Email</th>
                    <th className="px-5 py-3.5 font-semibold">Notes</th>
                    <th className="px-5 py-3.5 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f0f2ef]">
                  {filteredCustomers.map((customer) => (
                    <tr className="text-[#52615a]" key={customer.id}>
                      <td className="px-5 py-4 font-medium text-[#27352e]">
                        {customer.name}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4">
                        {customer.phone_number}
                      </td>
                      <td className="max-w-56 truncate px-5 py-4">
                        {customer.email || '—'}
                      </td>
                      <td
                        className="max-w-56 truncate px-5 py-4 text-[#748078]"
                        title={customer.notes || undefined}
                      >
                        {customer.notes || '—'}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex justify-end gap-1">
                          <button
                            aria-label={`View ${customer.name}`}
                            className="rounded-lg p-2 text-[#66736b] hover:bg-[#edf4ee] hover:text-emerald-800"
                            onClick={() => void openCustomer(customer.id, 'view')}
                            title="View customer"
                            type="button"
                          >
                            <Eye aria-hidden="true" size={16} />
                          </button>
                          <button
                            aria-label={`Edit ${customer.name}`}
                            className="rounded-lg p-2 text-[#66736b] hover:bg-[#edf4ee] hover:text-emerald-800"
                            onClick={() => void openCustomer(customer.id, 'edit')}
                            title="Edit customer"
                            type="button"
                          >
                            <Pencil aria-hidden="true" size={16} />
                          </button>
                          <button
                            aria-label={`Delete ${customer.name}`}
                            className="rounded-lg p-2 text-[#66736b] hover:bg-rose-50 hover:text-rose-700"
                            onClick={() => {
                              setDeleteError('')
                              setCustomerToDelete(customer)
                            }}
                            title="Delete customer"
                            type="button"
                          >
                            <Trash2 aria-hidden="true" size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!isLoading && customers.length > 0 && (
            <div className="border-t border-[#edf0ec] px-5 py-3 text-xs text-[#89938d]">
              Showing {filteredCustomers.length} of {customers.length} customers
            </div>
          )}
        </section>
      </div>

      {dialog?.type === 'loading' && (
        <div
          aria-label="Loading customer details"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30"
          role="status"
        >
          <LoaderCircle aria-hidden="true" className="animate-spin text-white" size={30} />
        </div>
      )}
      {dialog?.type === 'form' && (
        <CustomerFormDialog
          customer={dialog.customer}
          key={`${dialog.mode}-${dialog.customer?.id || 'new'}`}
          mode={dialog.mode}
          onClose={() => setDialog(null)}
          onSubmit={saveCustomer}
        />
      )}
      {dialog?.type === 'details' && (
        <CustomerDetailsDialog
          customer={dialog.customer}
          onClose={() => setDialog(null)}
        />
      )}
      {customerToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <section
            aria-labelledby="delete-customer-title"
            aria-modal="true"
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
            role="alertdialog"
          >
            <div className="flex size-11 items-center justify-center rounded-xl bg-rose-50 text-rose-700">
              <Trash2 aria-hidden="true" size={20} />
            </div>
            <h2
              className="mt-4 text-lg font-semibold text-[#17211d]"
              id="delete-customer-title"
            >
              Delete {customerToDelete.name}?
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#748078]">
              This will permanently remove this customer from your business.
            </p>
            {deleteError && (
              <p
                className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
                role="alert"
              >
                {deleteError}
              </p>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <button
                className="h-10 rounded-xl border border-[#dfe5df] px-4 text-sm font-medium text-[#52615a] hover:bg-[#f7f8f6] disabled:opacity-50"
                disabled={isDeleting}
                onClick={() => setCustomerToDelete(null)}
                type="button"
              >
                Cancel
              </button>
              <button
                className="h-10 rounded-xl bg-rose-700 px-4 text-sm font-semibold text-white hover:bg-rose-800 disabled:cursor-wait disabled:opacity-60"
                disabled={isDeleting}
                onClick={() => void confirmDelete()}
                type="button"
              >
                {isDeleting ? 'Deleting…' : 'Delete customer'}
              </button>
            </div>
          </section>
        </div>
      )}
    </DashboardLayout>
  )
}

export default Customers
