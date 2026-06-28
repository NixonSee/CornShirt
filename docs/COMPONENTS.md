# Components

## Layout Components
- Header / Navbar
- Footer
- Dashboard Sidebar
- Page Container

## Reusable UI Components
- Button ✅ — `src/components/common/Button.tsx`
  - Variants: `primary` (fire gradient), `secondary`, `outline`, `destructive`, `success`
  - Props: `variant`, `icon`, `loading`, `fullWidth`, `disabled`, `onClick`, `className`
- Card ✅ — `src/components/common/Card.tsx`
  - Variants: `metric` (stat cards), `panel` (content panels), `table` (table wrappers)
  - Props: `variant`, `title`, `description`, `icon`, `value`, `titleClassName`, `className`, `children`
- Status Badge
- Modal ✅ — `src/components/common/Modal.tsx`
  - Features: overlay backdrop, Escape key to close, click-outside to close
  - Props: `isOpen`, `onClose`, `title`, `children`, `actions`
- Input Field
- Select Dropdown
- Textarea
- File Upload Field (Event banner upload)
- SearchBar ✅ — `src/components/common/SearchBar.tsx`
  - Dark-themed search input with primary-color entered text
  - Props: `value`, `onChange`, `placeholder`
- Empty State
- Loading State
- Error Alert / Success Alert

## Data Display Components
- Table
- Pagination Controls
- Event Card
- Ticket Type Card
- Ticket Card
- Statistic Card
- Admin Charts ✅ — `src/components/admin/AdminCharts.tsx`
  - BarChart, PieChart, LineChart — dark-themed recharts wrappers with fire-accent colors

## Later Components
- QR Code Display
- QR Verification Result Panel
- Transaction History Table
- Top Up Balance Card
- Organizer Revenue Summary Card
