# change -o0 to -o2 for better compiler optimization
name=$(echo $1 | cut -f 1 -d '.')

/Users/habibabassem/Desktop/SoC/riscv64-gcc/bin/riscv64-unknown-elf-gcc -Wall -O0  -falign-functions=4 -march=rv32ic -mabi=ilp32 -nostdlib -mstrict-align -T link.ld -o $name.elf -lgcc crt0.S "$1"  -lgcc
/Users/habibabassem/Desktop/SoC/riscv64-gcc/bin/riscv64-unknown-elf-objcopy -O binary $name.elf $name.bin
/Users/habibabassem/Desktop/SoC/riscv64-gcc/bin/riscv64-unknown-elf-objcopy -O verilog $name.elf $name.hex
/Users/habibabassem/Desktop/SoC/riscv64-gcc/bin/riscv64-unknown-elf-objdump -d $name.elf > $name.lst
