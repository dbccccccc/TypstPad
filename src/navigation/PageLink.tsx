import { forwardRef, type AnchorHTMLAttributes } from 'react'
import { APP_PAGE_PATHS, type NavigablePage } from './routes'

interface PageLinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  page: NavigablePage
  onNavigate?: (page: NavigablePage) => void
}

// Keep real URLs, new-tab gestures, and navigation without JavaScript working.
const PageLink = forwardRef<HTMLAnchorElement, PageLinkProps>(function PageLink({ page, onNavigate, onClick, ...props }, ref) {
  return (
    <a
      {...props}
      ref={ref}
      href={APP_PAGE_PATHS[page]}
      onClick={(event) => {
        onClick?.(event)
        if (!onNavigate || event.defaultPrevented || event.button !== 0 ||
            event.metaKey || event.ctrlKey || event.shiftKey || event.altKey ||
            (props.target && props.target !== '_self') || props.download != null) return
        event.preventDefault()
        onNavigate(page)
      }}
    />
  )
})

export default PageLink
