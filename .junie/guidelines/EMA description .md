# **E-commerce Order Management System (Morocco COD)**

## **Objective**

Create a complete and clear system that connects Google Sheets orders with internal operations for Moroccan e-commerce (Cash on Delivery). The system helps manage orders, stock, advertising costs, and team performance — all in one place.

---

## **1\. Users and Roles**

### **Admin**

* Has full control of the system.

* Manages products, stock, and costs.

* Defines agent commissions and expenses.

* Views all dashboards and performance reports.

* Product cost information is **visible only to the admin**.

### **Supervisor (Call Center)**

* Can see **all orders** from all agents.

* Can assign or reassign orders to any agent.

* Monitors agent performance and order progress.

* Cannot see product cost.

### **Confirmation Agents**

* See only their own assigned orders (unless reassigned by supervisor or admin).

* Contact clients to confirm, reschedule, upsell, or cancel orders.

* Can **edit orders** if the client changes the product or quantity (for example, upsell).

* Update the order status after each contact.

* View their personal performance and commissions.

### **Media Buyers**

* See all products and their available stock (but not product cost).

* Add and track ad spend per product.

* Use stock information to know which products can be promoted.

* View results : Cout par lead. Cout par lead livrer,

---

## **2\. Main Features**

### **a) Product and Stock Management**

* Each product includes a name, reference (SKU), selling price, and available stock.

* **Only the admin** can see and edit the cost of goods.

* When an order is **confirmed**, the product quantity is reserved in stock.

* When the order is **shipped**, it is deducted from the available stock.

* When the order is **delivered**, it is permanently deducted from the total stock.

* If the order is **returned**, the product is added back to the stock.

* Alerts appear when a product’s stock is low.

### **b) Order Management**

* Orders are automatically imported from Google Sheets.

* Orders include customer information, products, prices, and quantities.

* Orders are assigned to agents automatically or manually by the supervisor or admin.

* Agents can edit orders before shipping (change product, quantity, or upsell).or add notes next to order

* Each order passes through different stages:  
   **New → Pending Confirmation → Confirmed → Shipped → Delivered / Returned / Canceled**

### **c) Expense and Commission Tracking**

* The admin manages all expenses (shipping, packaging, salaries, tools, etc.).

* Agents earn commissions per delivered order, with bonuses for good performance.

* The system calculates commissions automatically according to delivery ORDERS.

* Media buyers record ad spend per product.

### **d) Advertising Tracking**

* Media buyers record daily ad spend for each product and platform.

* They see the impact of ads on confirmed and delivered orders.

* When a product’s stock is low, the system alerts the media buyer to pause ads.

---

## **3\. Dashboards and Reports**

### **Admin Dashboard**

* Total sales, profit, confirmation rate, delivery rate.

* Profit per product (based on cost, ads, and shipping).

* Commission per agent.

* Performance by product and by advertising platform.

### **Supervisor Dashboard**

* All orders in one view (for all agents).

* Possibility to reassign orders between agents.

* Performance overview by agent.

### **Agent Dashboard**

* Personal performance: confirmed orders, delivery rate, commission.

* List of assigned orders with the ability to update or edit them.

### **Media Buyer Dashboard**

* View of all active products with stock availability.

* Ad spend tracking by product and platform.

* Lead livrer.cout par lead livrer

---

## **4\. Key Performance Indicators (KPIs)**

* **Confirmation Rate:** confirmed orders ÷ total contacted orders.

* **Delivery Rate:** delivered orders ÷ total shipped orders.

* **Profit per Product:** (Sales – Cost – Shipping – Ad spend – Other expenses) *visible only to admin*.

* **Agent Commission:** based on confirmed and delivered orders.

* **Global Metrics:** total revenue, total profit, average order value, ROAS, CAC.

---

## **5\. Process Flow Summary**

1. **Order Import:** Orders from Google Sheets enter the system automatically.

2. **Assignment:** Admin or Supervisor or automatic or they click assigns orders .

3. **Confirmation:** Agents contact clients to confirm, upsell, or cancel.and can order too (order from whatsapp or calls)

4. **Stock Update:** When confirmed, the product is reserved. When shipped or delivered, it’s deducted from stock.

5. **Shipping:** Orders are sent to delivery companies.

6. **Delivery/Return:** The system updates stock accordingly.

7. **Expenses & Ads:** Admin and media buyer enter their costs.

8. **Dashboards:** All KPIs update automatically for analysis.

---

## **6\. Advantages**

* Centralized and simple management for all operations.

* Clear visibility by role: Admin, Supervisor, Agent, Media Buyer.

* Real-time tracking of stock, orders, and ad spend.

* Easy coordination between sales and advertising teams.

* Accurate calculation of commissions and profits.

---

## **7\. Example Reports**

* **Agent Report:** name, handled orders, confirmation rate, delivery rate, commission.

* **Product Report:** name, sales, ad spend, profit, stock.

* **Supervisor Report:** team performance and order distribution.

* **Global Report:** revenue, costs, and profit overview.

---

## **8\. Future Improvements**

* Integration with delivery company APIs to update delivery status automatically.

* Automatic import of ad spend from Meta or TikTok.

* Notifications for low stock or high RTO rates.

---

