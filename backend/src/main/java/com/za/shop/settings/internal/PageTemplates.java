package com.za.shop.settings.internal;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Starter texts. They only give the shop owner a structure to fill in: they are NOT legal advice and must be
 * replaced (and checked by a lawyer) before the shop goes live. The cookie list in the privacy page is factual.
 */
final class PageTemplates {

    record Template(String title, String body) {
    }

    static final Map<String, Template> ALL = new LinkedHashMap<>();

    static {
        ALL.put("imprint", new Template("Imprint", """
                ## Provider
                [Company name and legal form]
                [Street and number]
                [Postcode and city]
                [Country]

                ## Contact
                Email: [email address]
                Phone: [phone number]

                ## Register entries
                [Commercial register, court and number]
                VAT identification number: [VAT ID]

                ## Responsible for the content
                [Name and address]
                """));
        ALL.put("terms", new Template("Terms and conditions", """
                ## 1. Scope
                [Who these terms apply to and which shop they cover.]

                ## 2. Contract
                [How a contract is formed: the order button, the confirmation email.]

                ## 3. Prices and payment
                [Prices include VAT. Accepted payment methods. When payment is due.]

                ## 4. Delivery
                [Delivery areas, delivery times, shipping costs, pickup.]

                ## 5. Right of withdrawal
                [See the returns page.]

                ## 6. Liability and warranty
                [Your statutory warranty and liability terms.]

                ## 7. Final provisions
                [Applicable law and place of jurisdiction.]
                """));
        ALL.put("privacy", new Template("Privacy policy", """
                ## Who is responsible
                [Company name, address and contact for privacy questions]

                ## What data we process
                When you create an account we store your name, email address and password (the password only as a
                one-way hash). When you order we store your delivery address, phone number if you give one, and the
                order. Orders are kept for the retention period required by tax law.

                ## Cookies
                This shop only sets cookies that are strictly necessary for it to work:
                za_at and za_rt keep you logged in; za_cart remembers your cart before you log in; za_compare
                remembers the products you are comparing; za_postcode remembers your delivery postcode.
                We do not use advertising or tracking cookies.

                ## Payments
                [Name your payment provider(s) and what they receive.]

                ## Your rights
                You can ask for access to your data, correction and deletion. You can delete your account yourself
                under Account, Settings. [How to reach us, and how to complain to a supervisory authority.]
                """));
        ALL.put("returns", new Template("Returns and withdrawal", """
                ## Right of withdrawal
                [How long customers have, from when, and how to withdraw.]

                ## How to return an item
                [Address, who pays the return shipping, condition of the goods.]

                ## Refunds
                [When and how you refund.]

                ## Exceptions
                [Goods that cannot be returned, for example perishable food or sealed hygiene products.]
                """));
    }

    private PageTemplates() {
    }
}
