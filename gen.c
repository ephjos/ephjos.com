//
// gen - ephjos.io static site generator
// ephjos - October 24, 2022
//
// Organization:
//   posts/     - Flat directory of Markdown files.
//   static/    - Files to copy as-is. Will be found at build/ in output.
//   build/     - Output directory.
//
// Markdown frontmatter:
//   title   - Name of the post, should match the name of the file.
//   date    - dd/mm/yyyy formatted string representing when the file was
//             written. The file is written to build/blog/yyyy/mm/dd/index.html.
//
//

#define _DEFAULT_SOURCE
#define _BSD_SOURCE
#define _GNU_SOURCE

#include <dirent.h>
#include <errno.h>
#include <stdarg.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/stat.h>
#include <sys/types.h>
#include <time.h>
#include <unistd.h>

/* defines */

#define POSTS "./posts/"
#define STATIC "./static/"
#define BUILD "./build/"

#define BUF_SIZE 1024

/* utils */

void panic(const char *fmt, ...) {
	char error_message[BUF_SIZE];

	va_list ap;
	va_start(ap, fmt);

	vsnprintf(error_message, sizeof(error_message), fmt, ap);

	va_end(ap);

	perror(error_message);
	exit(1);
}

/* data */
typedef struct stats_t {
	int bytes_read;
	int bytes_written;
	int files_read;
	int files_written;
	clock_t started;
} stats_t;
stats_t stats;
#define STATS_INIT ((stats_t) {0, 0, 0, 0, clock()})

void print_stats() {
	clock_t end = clock();
	clock_t clocks = end-stats.started;

	printf("\n --- gen stats ---\n");
	printf("Took %0.4f seconds, %ld clocks\n", ((double)clocks / CLOCKS_PER_SEC), clocks);
	printf("Bytes read: %-16d Bytes written: %-16d\n", stats.bytes_read, stats.bytes_written);
	printf("Files read: %-16d Files written: %-16d\n", stats.files_read, stats.files_written);
}

/* markdown */
typedef struct md_t {
	char *title;
	int title_len;
	int dd;
	int mm;
	int yyyy;
	char *b;
	int len;
} md_t;
#define MD_INIT ((md_t) {NULL, 0, 0, 0, 0, NULL, 0})

void free_md(md_t *md) {
	free(md->title);
	free(md->b);
}

void parse_md(FILE *fp, md_t *md) {
	char c = fgetc(fp);

	char *new_title = malloc(1*sizeof(char));
	if (new_title == NULL) {
		panic("No title");
		return;
	}

	new_title[0] = c;
	md->title = new_title;
	md->title_len = 1;

	char *new_b = malloc(3*sizeof(char));
	if (new_b == NULL) {
		panic("No b");
		return;
	}

	new_b[0] = c;
	new_b[1] = c;
	new_b[2] = c;
	md->b = new_b;
	md->len = 3;

	md->yyyy = 2022;
	md->dd = 24;
	md->mm = 10;
}

/* filesystem */

void mkdirp(const char *filename) {
	int e = mkdir(filename, S_IRWXU);
	if (e == -1 && errno != EEXIST) {
		panic("Could not mkdir '%s' with error %d\n", filename, e);
		return;
	}
}

void write_md(md_t *md) {
	char *outfile = malloc((sizeof(BUILD) + 21) * sizeof(char));
	int i = 0;
	i += sprintf(outfile, "%s", BUILD); mkdirp(outfile);
	i += sprintf(outfile+i, "%d/", md->yyyy); mkdirp(outfile);
	i += sprintf(outfile+i, "%d/", md->mm); mkdirp(outfile);
	i += sprintf(outfile+i, "%d/", md->dd); mkdirp(outfile);
	i += sprintf(outfile+i, "index.html");

	FILE *fp = fopen(outfile, "w");
	if (fp == NULL) {
		panic("Could not open output post file for writing: %s\n", outfile);
		return;
	}

	fputs(md->b, fp);
	fclose(fp);

	stats.bytes_written += md->len;
	stats.files_written += 1;
}

void genPost(const char *filename) {
	printf("generating: %s \n", filename);
	FILE *fp = fopen(filename, "r");
	if (fp == NULL) {
		panic("Could not open post file for reading: %s\n", filename);
		return;
	}

	md_t md = MD_INIT;

	parse_md(fp, &md);
	write_md(&md);

	free_md(&md);
	fclose(fp);

	stats.files_read += 1;
}

void genPosts() {
	DIR *d;
	struct dirent *dir;
	d = opendir(POSTS);
	if (!d) {
		panic("Could not find posts directory at: %s\n", POSTS);
		return;
	}

	while ((dir = readdir(d)) != NULL) {
		if (dir->d_type == DT_REG) {
			char *s = (char*)malloc((sizeof(POSTS) + strlen(dir->d_name)) * sizeof(char));
			sprintf(s, "%s%s", POSTS, dir->d_name);

			genPost(s);

			free(s);
		}
	}

	closedir(d);
	return;
}

void copyFile(const char *src, const char *dst) {
	FILE *src_fp = fopen(src, "r");
	if (src_fp == NULL) {
		panic("Could not open src for copy: %s\n", src);
		return;
	}

	FILE *dst_fp = fopen(dst, "w");
	if (dst_fp == NULL) {
		panic("Could not open dst for copy: %s\n", dst);
		return;
	}

	size_t n;
	char buf[BUF_SIZE];
	while ((n = fread(buf, 1, BUF_SIZE, src_fp)) > 0) {
		stats.bytes_read += n;
		stats.bytes_written += n;

		if (fwrite(buf, 1, n, dst_fp) != n) {
			panic("Could not write complete buf to dst (%s)\n--start buf--\n%s\n--end buf--\n", dst, buf);
			return;
		}
	}

	fclose(src_fp);
	fclose(dst_fp);

	stats.files_read += 1;
	stats.files_written += 1;
}

void recursiveCopy(const char *dirname, int n) {
	DIR *d;
	struct dirent *dir;
	d = opendir(dirname);
	if (!d) {
		panic("Could not find directory at: %s\n", dirname);
		return;
	}

	char *dstDir = (char*)malloc((strlen(BUILD) + n + 1) * sizeof(char));
	int i = 0;
	i += sprintf(dstDir, "%s", BUILD); mkdirp(dstDir);
	i += sprintf(dstDir+i, "%s", dirname); mkdirp(dstDir);
	free(dstDir);

	// TODO: sort out the +1s here, should not be needed
	while ((dir = readdir(d)) != NULL) {
		unsigned char filetype = dir->d_type;
		char *filename = dir->d_name;

		if (filetype == DT_REG) {
			char *src = (char*)malloc((strlen(filename) + n + 1) * sizeof(char));
			if (src == NULL) {
				panic("Could not create src for  (%s, %s)\n", dirname, filename);
				return;
			}

			int m = sprintf(src, "%s%s", dirname, filename);
			char *dst = (char*)malloc((strlen(BUILD) + m + 1) * sizeof(char));
			if (dst == NULL) {
				panic("Could not create dst for (%s, %s, %s)\n", BUILD, dirname, filename);
				return;
			}

			int i = 0;
			i += sprintf(dst, "%s", BUILD); mkdirp(dst);
			i += sprintf(dst+i, "%s", dirname); mkdirp(dst);
			i += sprintf(dst+i, "%s", filename);

			copyFile(src, dst);

			free(src);
			free(dst);
		} else if (filetype == DT_DIR) {
			// Skip . and ..
			if (filename[0] == '.' && (filename[1] == '.' || filename[1] == '\0')) {
				continue;
			}

			char *src = (char*)malloc((strlen(filename) + n + 1) * sizeof(char));
			if (src == NULL) {
				panic("Could not create path for recursiveCopy (%s, %s)\n", dirname, filename);
				return;
			}

			int m = sprintf(src, "%s%s/", dirname, filename);
			recursiveCopy(src, m);

			free(src);
		}
	}

	closedir(d);
	return;
}

void copyStatic() {
	recursiveCopy(STATIC, sizeof(STATIC));
}

/* entrypoint */

void initData() {
	stats = STATS_INIT;
}

int main() {
	initData();

	// TODO: cleanup and prepare build directory

	genPosts();

	// TODO: create post index

	copyStatic();

	print_stats();
	return 0;
}
