msg = update


test: clean
	cd public && make test
	cd lambda && make test

prod: clean
	cd public && make prod
	cd lambda && make prod

ignorelargefiles:
	find . -size +50M | sed 's|^\./||g' | cat >> .gitignore

tag:
	git tag addedgroupsreal
	git push origin --tags

check:
	git pull --no-commit origin main

pull:
	git pull origin main

update:
	git add .
	git commit -m "$(msg)" 
	git push origin main

clean:
