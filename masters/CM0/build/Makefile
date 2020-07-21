ARMGNU := arm-none-eabi
GCCOPS := -Wall -nostdlib -nostartfiles -ffreestanding -mcpu=cortex-m0 -Wno-unused-value

#STARTUP := start.c
STARTUP := ./sw/start.s
STARTUP_OBJECT := ./sw/start.o
#LINKSCRIPT := link.ld
LINKSCRIPT := simple.ld
# DBGIO := ./sw/dbgio_drv.c
TEST := main

#$(STARTUP_OBJECT): $(STARTUP)
#	$(ARMGNU)-gcc $(GCCOPS) -O0 -c -o $@ $<

$(STARTUP_OBJECT): $(STARTUP)
	$(ARMGNU)-as -mcpu=cortex-m0 -o $@ $<

# dbgio_drv.o: $(DBGIO)
# 	$(ARMGNU)-gcc $(GCCOPS) -O0 -c  -o $@ $<

$(TEST).o: $(TEST).c
	$(ARMGNU)-gcc $(GCCOPS) -O0 -c  -o $@ $<

$(TEST).hex: $(TEST).o $(OBJS) $(STARTUP_OBJECT) 
	#$(ARMGNU)-gcc  -T $(LINKSCRIPT)  $(STARTUP_OBJECT) dbgio.o por.o -o por.elf
	$(ARMGNU)-ld  -T $(LINKSCRIPT)  $(STARTUP_OBJECT) $(OBJS) $(TEST).o -o $(TEST).elf
	$(ARMGNU)-objdump -d -S $(TEST).elf > $(TEST).lst 
	$(ARMGNU)-objcopy $(TEST).elf -O verilog $(TEST).hex 

$(TEST).vvp: SoC.tb.v
	iverilog -D DBG -o $(TEST).vvp -c ../../dv.list -c ../../rtl.list -c ../../foundry-ips.list ./SoC.tb.v 2>&1 | grep -v timing

.DEFAULT_GOAL := all

all: $(TEST).hex 

.PHONY : clean
clean: 
	rm *.o *.vvp *.vcd *.hex *.lst