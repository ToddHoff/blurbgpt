install: test prod

test:
	cp bin/web-test-cfg.js ./js/cfg.js
	./bin/install_website test

prod:
	cp bin/web-prod-cfg.js ./js/cfg.js
	./bin/install_website prod
	cp bin/web-test-cfg.js ./js/cfg.js

web:
	http-server
