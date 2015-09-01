serve: node_modules
	@$</.bin/serve -Slojp 0

node_modules: package.json
	@npm install
	@ln -sfn .. $@/mana

.PHONY: serve
