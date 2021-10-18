
.PHONY: dev
dev:
	docker-compose up --build

.PHONY: push
push:
	sh ./bin/update
	git add -u
	git commit
	docker-compose build
	docker-compose push
	git push
