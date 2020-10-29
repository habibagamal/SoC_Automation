#define     SET_BIT(reg, bit)       (reg) = ((reg) | (1<<bit))
#define     CLR_BIT(reg, bit)       (reg) = ((reg) & (~(1<<bit)))
#define     CHK_BIT(reg, bit)       ((reg) & (1<<bit))