dir="CM0/Raptor"
dir_output="CM0_Raptor_output"
soc="raptor"
subsystem="apb"
dump="real_dump"

# # subsystem + real master
node ./src/sys_gen.js -soc ./systems/$dir/$soc.json -subsystem ./systems/$dir/$subsystem.json -IPlib ./IPs/IPs.json -mastersLib ./masters/masters.json -outDir ./$dir_output/

# # no subsystem + real master
# node ./src/sys_gen.js -soc ./Examples/$dir/$soc.json -IPlib ./IPs/IPs.json -mastersLib ./masters/masters.json -outDir ./$dir_output/

echo "****************************"
echo "System Generated"
echo "****************************"

cd $dir_output
mv ../TestingPrograms/main.hex ./main.hex

find . -name "*.v" > file.lst
iverilog -o ./$dump.vvp -c file.lst
vvp ./$dump.vvp 

open -a scansion.app ./$dump.vcd

echo "****************************"
echo "Script done"
echo "****************************"
