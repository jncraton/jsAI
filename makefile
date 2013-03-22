sc_path = d:\games\sc
launcher = d:\games\sc\Chaoslauncher\chaoslauncher.exe
src = src

all: mpq

run: patch
	@$(launcher)

patch: mpq
	@cp build/patch_rt.mpq $(sc_path)\patch_rt.mpq

mpq: aiscript
	@python tools\writeAIScript.py build/aiscript.bin build/patch_rt.mpq

aiscript:
	node example $(subst .pyai,,$@) build/$@;

bins: combined_scripts
	python tools\pyai.pyw -c -w ../build/combined.pyai ../build/aiscript.bin ../build/bwscript.bin

combined_scripts: terran.pyai zerg.pyai protoss.pyai
	@cat build/terran.pyai build/zerg.pyai build/protoss.pyai > build/combined.pyai



