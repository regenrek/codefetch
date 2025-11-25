import { describe, it, expect } from "vitest";
import { createHash, detectLanguage } from "../src/utils";

describe("utils", () => {
  describe("createHash", () => {
    it("should create consistent hash for same input", () => {
      const hash1 = createHash("test input");
      const hash2 = createHash("test input");

      expect(hash1).toBe(hash2);
    });

    it("should create different hashes for different inputs", () => {
      const hash1 = createHash("input1");
      const hash2 = createHash("input2");

      expect(hash1).not.toBe(hash2);
    });

    it("should handle empty string", () => {
      const hash = createHash("");

      expect(hash).toBeDefined();
      expect(typeof hash).toBe("string");
    });

    it("should handle special characters", () => {
      const hash = createHash("special chars: !@#$%^&*()");

      expect(hash).toBeDefined();
      expect(typeof hash).toBe("string");
    });
  });

  describe("detectLanguage", () => {
    it("should detect TypeScript", () => {
      expect(detectLanguage("file.ts")).toBe("typescript");
      expect(detectLanguage("component.tsx")).toBe("typescript");
    });

    it("should detect JavaScript", () => {
      expect(detectLanguage("script.js")).toBe("javascript");
      expect(detectLanguage("component.jsx")).toBe("javascript");
      expect(detectLanguage("config.mjs")).toBe("javascript");
      expect(detectLanguage("config.cjs")).toBe("javascript");
    });

    it("should detect Python", () => {
      expect(detectLanguage("script.py")).toBe("python");
    });

    it("should detect CSS and variants", () => {
      expect(detectLanguage("styles.css")).toBe("css");
      expect(detectLanguage("styles.scss")).toBe("scss");
      expect(detectLanguage("styles.sass")).toBe("sass");
      expect(detectLanguage("styles.less")).toBe("less");
    });

    it("should detect markup languages", () => {
      expect(detectLanguage("index.html")).toBe("html");
      expect(detectLanguage("README.md")).toBe("markdown");
      expect(detectLanguage("config.xml")).toBe("xml");
    });

    it("should detect data formats", () => {
      expect(detectLanguage("config.json")).toBe("json");
      expect(detectLanguage("config.yaml")).toBe("yaml");
      expect(detectLanguage("config.yml")).toBe("yaml");
      expect(detectLanguage("config.toml")).toBe("toml");
    });

    it("should detect shell scripts", () => {
      expect(detectLanguage("script.sh")).toBe("bash");
      expect(detectLanguage("script.bash")).toBe("bash");
      expect(detectLanguage("script.zsh")).toBe("bash");
    });

    it("should detect Go", () => {
      expect(detectLanguage("main.go")).toBe("go");
    });

    it("should detect Rust", () => {
      expect(detectLanguage("main.rs")).toBe("rust");
    });

    it("should detect Java and Kotlin", () => {
      expect(detectLanguage("Main.java")).toBe("java");
      expect(detectLanguage("Main.kt")).toBe("kotlin");
    });

    it("should detect C/C++", () => {
      expect(detectLanguage("main.c")).toBe("c");
      expect(detectLanguage("main.cpp")).toBe("cpp");
      // .h files return "text" as they're not in the language map
      expect(detectLanguage("header.h")).toBe("text");
      expect(detectLanguage("header.hpp")).toBe("text");
    });

    it("should detect Ruby", () => {
      expect(detectLanguage("script.rb")).toBe("ruby");
    });

    it("should detect PHP", () => {
      expect(detectLanguage("index.php")).toBe("php");
    });

    it("should detect Swift", () => {
      expect(detectLanguage("main.swift")).toBe("swift");
    });

    it("should detect SQL", () => {
      expect(detectLanguage("query.sql")).toBe("sql");
    });

    it("should detect Dockerfile", () => {
      expect(detectLanguage("Dockerfile")).toBe("dockerfile");
    });

    it("should return 'text' for unknown extensions", () => {
      expect(detectLanguage("file.unknown")).toBe("text");
      expect(detectLanguage("noextension")).toBe("text");
    });
  });
});
