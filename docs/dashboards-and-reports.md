# Dashboards and Reports

The authenticated `/dashboard` landing page is guarded by the `dashboard:view` permission so that only authorized personnel can see the consolidated dashboards. From there, the navigation tiles lead into the same hybrid features but the landing page itself surfaces high-level KPIs and role-specific views.

## Role-specific dashboards

### Admin Dashboard
- Total sales, profit, confirmation rate, and delivery rate summaries.
- Profit-per-product breakdown taking cost, ads, shipping, and other expenses into account.
- Commission tracking per agent alongside performance by product and by advertising platform.

### Supervisor Dashboard
- Unified view of all orders (across every agent).
- Controls to reassign orders between agents when needed.
- High-level performance overview for the agent fleet to highlight bottlenecks or top performers.

### Agent Dashboard
- Personal performance stats such as confirmed orders, delivery rate, and commission accrued.
- Editable list of assigned orders, surface quick actions for status updates or edits.

### Media Buyer Dashboard
- Inventory-aware list of active products with current stock availability.
- Ad-spend tracking broken down per product and advertising platform.
- Cost per lead delivered to monitor the efficiency of paid campaigns.

## Data surfacing
- The dashboard currently issues lightweight counts against the hybrid domains for products, orders, expenses, and ads (each call requests one row with `includeSchema=false`) so the landing page always shows the number of records available per domain even when richer KPIs still depend on future backend work.
- The landing page now also exposes a KPI grid (confirmation/delivery rates, profit per product, agent commission, revenue/profit/average order value, ROAS, CAC) and a role-insight section that reiterates the admin, supervisor, agent, and media dashboards described above.

## Key performance indicators (KPIs)
- **Confirmation Rate:** confirmed orders ÷ contacted orders.
- **Delivery Rate:** delivered orders ÷ shipped orders.
- **Profit per Product:** `(Sales – Cost – Shipping – Ad spend – Other expenses)` (visible to admins only).
- **Agent Commission:** calculated from confirmed and delivered orders.
- **Global Metrics:** total revenue, total profit, average order value, ROAS, CAC.
