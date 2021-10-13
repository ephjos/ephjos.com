
.PHONY: dev
dev:
	docker-compose up --build

.PHONY: push
push:
	docker-compose build
	docker-compose push
	git push
