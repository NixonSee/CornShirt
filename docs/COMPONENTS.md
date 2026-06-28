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
- Modal / Confirmation Dialog (Approve/reject event confirmation)
- Input Field
- Select Dropdown
- Textarea
- File Upload Field (Event banner upload)
- Search Bar
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
