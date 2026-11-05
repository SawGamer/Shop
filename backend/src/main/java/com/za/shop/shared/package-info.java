/**
 * Shared kernel: value types (money, paging), error handling and the current-user helper.
 * Open module — every other module may use any of its types.
 */
@ApplicationModule(type = ApplicationModule.Type.OPEN, displayName = "Shared kernel")
package com.za.shop.shared;

import org.springframework.modulith.ApplicationModule;
