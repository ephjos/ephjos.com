
.PHONY: dev
dev:
	docker-compose up --build

.PHONY: push
push:
	sh ./bin/update
	docker-compose build
	docker-compose push
	git push
