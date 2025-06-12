package main

import (
	"bufio"
	"encoding/json"
	"flag"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"unicode/utf8"
)

type FileStats struct {
	Files      int    `json:"files"`
	Lines      int    `json:"lines,omitempty"`
	Classes    int    `json:"classes,omitempty"`
	Functions  int    `json:"functions,omitempty"`
	Comments   int    `json:"comments,omitempty"`
	EmptyLines int    `json:"emptyLines,omitempty"`
	Imports    int    `json:"imports,omitempty"`
	Exports    int    `json:"exports,omitempty"`
	Structs    int    `json:"structs,omitempty"`
	FileSize   string `json:"fileSize"`
	SizeBytes  int64  `json:"-"`
}

var mediaExtensions = []string{".jpg", ".jpeg", ".png", ".gif", ".bmp", ".mp4", ".avi", ".mov", ".mkv", ".mp3", ".opus", ".ogg", ".wav", ".m4a"}
var defaultIgnoredDirs = []string{"node_modules", ".git", ".cache", "vendor"}

func main() {
	var fileExts extensions
	var dirs directories
	var ignoreDirs directories
	var includeAll bool

	flag.Var(&fileExts, "f", "File extensions to look for (comma separated, e.g. -f js,ts,tsx,py,go or -f *)")
	flag.Var(&dirs, "d", "Directories to search (comma separated, e.g. -d .,./src,./dist)")
	flag.Var(&ignoreDirs, "i", "Additional directories to ignore (comma separated, e.g. -i .vscode,.idea)")
	flag.BoolVar(&includeAll, "a", false, "Include file-based stats for each extension")

	flag.Parse()

	if len(fileExts) == 0 || len(dirs) == 0 {
		fmt.Println("Please provide at least one file extension and one directory.")
		flag.Usage()
		return
	}

	ignoreDirs = append(ignoreDirs, defaultIgnoredDirs...)

	final := make(map[string]FileStats)

	for _, ext := range fileExts {
		for _, dir := range dirs {
			err := filepath.Walk(dir, func(path string, info os.FileInfo, err error) error {
				if err != nil {
					return err
				}

				if info.IsDir() {
					for _, ignoreDir := range ignoreDirs {
						if strings.Contains(path, ignoreDir) {
							return filepath.SkipDir
						}
					}
				} else {
					fileExt := filepath.Ext(info.Name())
					if ext == "*" || (fileExt != "" && strings.HasSuffix(info.Name(), ext)) {
						data, err := os.Open(path)
						if err != nil {
							fmt.Printf("Error opening file %s: %v\n", path, err)
							return nil
						}

						defer data.Close()

						buf := make([]byte, 1024)
						n, _ := data.Read(buf)
						if !utf8.Valid(buf[:n]) {
							return nil
						}

						if fileExt == "" {
							fileExt = "*"
						} else {
							fileExt = strings.TrimPrefix(fileExt, ".")
						}

						key := "." + fileExt

						if isMediaFile(fileExt) {
							key = "media"
						}

						processFile(data, &final, key)
					}
				}

				return nil
			})

			if err != nil {
				fmt.Printf("Error walking through directory %s: %v\n", dir, err)
			}
		}
	}

	overall := FileStats{}
	for key, stats := range final {
		stats.FileSize = formatFileSize(stats.SizeBytes)
		final[key] = stats

		// Summing up to the overall stats
		overall.Files += stats.Files
		overall.Lines += stats.Lines
		overall.Classes += stats.Classes
		overall.Functions += stats.Functions
		overall.Comments += stats.Comments
		overall.EmptyLines += stats.EmptyLines
		overall.Imports += stats.Imports
		overall.Exports += stats.Exports
		overall.Structs += stats.Structs
		overall.SizeBytes += stats.SizeBytes
	}

	overall.FileSize = formatFileSize(overall.SizeBytes)
	final["overall"] = overall

	// If -a flag is not provided, remove all file-based stats, leaving only "overall"
	if !includeAll {
		for key := range final {
			if key != "overall" {
				delete(final, key)
			}
		}
	}

	removeZeroValuedProperties(&final)

	output, err := json.MarshalIndent(final, "", "  ")
	if err != nil {
		fmt.Printf("Error marshaling JSON: %v\n", err)
		return
	}

	fmt.Println(string(output))
}

type extensions []string

func (e *extensions) String() string {
	return strings.Join(*e, ",")
}

func (e *extensions) Set(value string) error {
	if value == "*" {
		*e = []string{"*"}
	} else {
		*e = strings.Split(value, ",")
	}

	return nil
}

type directories []string

func (d *directories) String() string {
	return strings.Join(*d, ",")
}

func (d *directories) Set(value string) error {
	*d = strings.Split(value, ",")
	return nil
}

func processFile(data *os.File, result *map[string]FileStats, key string) {
	fileInfo, err := data.Stat()
	if err != nil {
		fmt.Printf("Error getting file info: %v\n", err)
		return
	}

	scanner := bufio.NewScanner(data)
	const maxCapacity = 512 * 1024

	buf := make([]byte, maxCapacity)
	scanner.Buffer(buf, maxCapacity)

	classes, functions, comments, emptyLines, imports, exports, structs := 0, 0, 0, 0, 0, 0, 0
	lines := 0

	for scanner.Scan() {
		line := scanner.Text()
		lines++

		if strings.Contains(line, "class") {
			classes++
		} else if strings.Contains(line, "function") || strings.Contains(line, "def") || strings.Contains(line, "func") {
			functions++
		} else if strings.Contains(line, "//") || strings.Contains(line, "#") || strings.Contains(line, "/*") {
			comments++
		} else if strings.Contains(line, "import") {
			imports++
		} else if strings.Contains(line, "export") {
			exports++
		} else if strings.Contains(line, "struct") {
			structs++
		} else if strings.TrimSpace(line) == "" {
			emptyLines++
		}
	}

	if err := scanner.Err(); err != nil {
		fmt.Printf("Error scanning file: %v\n", err)
		return
	}

	if _, exists := (*result)[key]; !exists {
		(*result)[key] = FileStats{}
	}

	stats := (*result)[key]
	stats.Files++
	stats.Lines += lines
	stats.Classes += classes
	stats.Functions += functions
	stats.Comments += comments
	stats.EmptyLines += emptyLines
	stats.Imports += imports
	stats.Exports += exports
	stats.Structs += structs
	stats.SizeBytes += fileInfo.Size()

	(*result)[key] = stats
}

func isMediaFile(ext string) bool {
	for _, mediaExt := range mediaExtensions {
		if ext == mediaExt {
			return true
		}
	}

	return false
}

func formatFileSize(size int64) string {
	const (
		_  = iota
		KB = 1 << (10 * iota)
		MB
		GB
		TB
	)

	switch {
	case size >= TB:
		return fmt.Sprintf("%.2f TB", float64(size)/TB)
	case size >= GB:
		return fmt.Sprintf("%.2f GB", float64(size)/GB)
	case size >= MB:
		return fmt.Sprintf("%.2f MB", float64(size)/MB)
	case size >= KB:
		return fmt.Sprintf("%.2f KB", float64(size)/KB)
	default:
		return fmt.Sprintf("%d bytes", size)
	}
}

func removeZeroValuedProperties(final *map[string]FileStats) {
	for key, stats := range *final {
		if stats.Files == 0 && stats.Lines == 0 && stats.Classes == 0 && stats.Functions == 0 &&
			stats.Comments == 0 && stats.EmptyLines == 0 && stats.Imports == 0 && stats.Exports == 0 &&
			stats.Structs == 0 && stats.SizeBytes == 0 {
			delete(*final, key)
		}
	}
}
