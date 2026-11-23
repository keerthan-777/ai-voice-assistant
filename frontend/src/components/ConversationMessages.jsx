function formatMessageTime(timestamp) {
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) {
    return 'Time unavailable'
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function ConversationMessages({ customerName, messages }) {
  if (messages.length === 0) {
    return (
      <div className="flex min-h-40 items-center justify-center px-5 text-center text-sm text-[#89938d]">
        No messages in this conversation.
      </div>
    )
  }

  return (
    <ol aria-label="Conversation messages" className="space-y-5">
      {messages.map((message) => {
        const isCustomerMessage = message.role === 'user'
        const senderName = isCustomerMessage
          ? customerName || 'Customer'
          : message.role === 'assistant'
            ? 'AI Assistant'
            : message.role

        return (
          <li
            className={`flex ${isCustomerMessage ? 'justify-end' : 'justify-start'}`}
            key={message.id}
          >
            <article
              className={`max-w-[88%] rounded-2xl px-4 py-3 sm:max-w-[78%] ${
                isCustomerMessage
                  ? 'rounded-br-md bg-[#123c32] text-white'
                  : 'rounded-bl-md border border-[#e7ebe6] bg-[#f7f9f7] text-[#27352e]'
              }`}
            >
              <div className="flex items-center justify-between gap-5">
                <p
                  className={`text-xs font-semibold ${
                    isCustomerMessage ? 'text-emerald-100' : 'text-emerald-900'
                  }`}
                >
                  {senderName}
                </p>
                <time
                  className={`text-[10px] ${
                    isCustomerMessage ? 'text-emerald-100/80' : 'text-[#89938d]'
                  }`}
                  dateTime={message.created_at}
                  title={formatMessageTime(message.created_at)}
                >
                  {formatMessageTime(message.created_at)}
                </time>
              </div>
              <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6">
                {message.content}
              </p>
            </article>
          </li>
        )
      })}
    </ol>
  )
}

export default ConversationMessages
