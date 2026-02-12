import '@/modules/website/templates/template-styles.css'

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="template-wrapper">
      {children}
    </div>
  )
}
