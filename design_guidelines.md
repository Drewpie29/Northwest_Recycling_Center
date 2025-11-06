# Northwest Missouri State Recycling Center - Design Guidelines

## Design Approach
**System-Based Design** using Material Design principles adapted for institutional/utility applications. This recycling center management system prioritizes efficiency, data clarity, and ease of use for staff members performing daily operations.

## Typography System
- **Primary Font**: Inter (sans-serif) - clean, highly legible for data-heavy interfaces
- **Hierarchy**:
  - Page Titles: 2xl (1.5rem), semibold
  - Section Headers: xl (1.25rem), semibold
  - Card/Component Titles: lg (1.125rem), medium
  - Body Text: base (1rem), regular
  - Labels/Captions: sm (0.875rem), regular
  - Data/Metrics: Tabular numbers for alignment

## Layout & Spacing System
**Tailwind Units**: Use 4, 6, 8, 12, 16, 20 as core spacing primitives
- Component padding: p-6 to p-8
- Section spacing: py-12 to py-16
- Card gaps: gap-6
- Form field spacing: space-y-4
- Grid gutters: gap-4 to gap-6

**Container Strategy**:
- Login page: Centered card, max-w-md (28rem)
- Dashboard: Full-width with max-w-7xl container
- Forms/Data entry: max-w-2xl for optimal completion
- Reports: max-w-6xl for data tables

## Core Components

### Authentication
**Login Page**:
- Centered vertical layout with university logo (100px width)
- Single-column form within rounded card (rounded-xl)
- Input fields: Full width with consistent spacing
- Submit button: Full width, prominent
- Footer: Copyright/institutional text centered below form

### Dashboard Layout
**Structure**: Sidebar + Main Content
- **Sidebar** (fixed, 16rem width):
  - University logo at top (p-6)
  - Navigation links (py-3, px-4 each)
  - User profile at bottom
  - Active state: subtle background treatment
  
- **Main Content Area**:
  - Page header with title and action buttons (flex justify-between)
  - Content sections in cards with proper elevation
  - Responsive grid for metrics/statistics

### Data Display Components

**Metrics Cards** (grid-cols-1 md:grid-cols-2 lg:grid-cols-4):
- Large number display (3xl, bold)
- Label below number (sm, secondary text)
- Icon at top-right for category identification
- Minimal padding (p-6)
- Subtle border or shadow for definition

**Data Entry Forms**:
- Two-column layout on desktop (grid-cols-2)
- Single column on mobile
- Label above each input
- Input fields: Consistent height (h-10), rounded corners (rounded-md)
- Select dropdowns: Match input styling
- Date pickers: Integrated, consistent styling
- Submit buttons: Right-aligned or full-width on mobile

**Data Tables**:
- Striped rows for readability
- Sticky header when scrolling
- Sortable column headers (with icon indicators)
- Actions column (right-aligned)
- Responsive: Stack to cards on mobile
- Pagination controls at bottom (centered)

**Reporting Views**:
- Date range selector at top (flex layout)
- Chart/graph area (8:5 aspect ratio recommended)
- Summary statistics below charts (grid layout)
- Export button (top-right)

### Interaction Patterns
- **Navigation**: Highlight active page in sidebar
- **Forms**: Inline validation messages below fields
- **Buttons**: 
  - Primary actions: Solid fill, medium weight
  - Secondary actions: Outlined style
  - Destructive actions: Visually distinct treatment
  - Icon + text for clarity where applicable
- **Loading states**: Skeleton screens for data tables, spinners for actions
- **Empty states**: Centered message with icon and call-to-action

## University Branding Integration
- Logo placement: Top-left of sidebar and centered on login
- Institutional footer on all pages
- Professional, trustworthy aesthetic appropriate for university operations

## Accessibility Requirements
- All form inputs with proper labels (no placeholder-only)
- Focus indicators on all interactive elements
- Sufficient contrast ratios throughout
- ARIA labels for icon-only buttons
- Keyboard navigation support for all functions

## Page-Specific Layouts

**Login**: Minimal, focused single-purpose page
**Dashboard**: Metrics overview + quick actions + recent activity
**Data Entry**: Form-focused with clear sections and progress indication
**Reports**: Chart/visualization emphasis with filtering controls
**Settings/Profile**: Two-column layout (navigation + content)

This system creates a professional, efficient interface optimized for daily recycling center operations while maintaining Northwest Missouri State's institutional identity.