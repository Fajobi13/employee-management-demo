package dockerfile

import rego.v1

# Dockerfile must specify a USER (non-root)
deny contains msg if {
	not has_user_instruction
	msg := "Dockerfile must include a USER instruction to run as non-root"
}

has_user_instruction if {
	some instruction in input
	instruction.Cmd == "user"
}

# Dockerfile must not use ADD — prefer COPY
deny contains msg if {
	some instruction in input
	instruction.Cmd == "add"
	not startswith(instruction.Value[0], "http")
	not endswith(instruction.Value[0], ".tar")
	not endswith(instruction.Value[0], ".tar.gz")
	msg := sprintf("Use COPY instead of ADD for '%s'", [instruction.Value[0]])
}

# FROM must use an explicit tag (not latest or untagged)
deny contains msg if {
	some instruction in input
	instruction.Cmd == "from"
	val := instruction.Value[0]
	not contains(val, ":")
	val != "scratch"
	not contains(val, " as ")
	msg := sprintf("Base image '%s' must have an explicit tag", [val])
}

deny contains msg if {
	some instruction in input
	instruction.Cmd == "from"
	val := instruction.Value[0]
	endswith(val, ":latest")
	not is_chainguard_image(val)
	msg := sprintf("Base image '%s' must not use the 'latest' tag", [val])
}

# Chainguard images only offer :latest on the free tier and are
# continuously rebuilt to target zero known CVEs, so :latest is acceptable.
is_chainguard_image(val) if {
	startswith(val, "cgr.dev/chainguard/")
}

# Dockerfile must use multi-stage build
deny contains msg if {
	not is_multistage
	msg := "Dockerfile must use a multi-stage build (at least 2 FROM instructions)"
}

is_multistage if {
	count([instruction | some instruction in input; instruction.Cmd == "from"]) >= 2
}

# Must not use 'root' as USER
deny contains msg if {
	some instruction in input
	instruction.Cmd == "user"
	instruction.Value[0] == "root"
	msg := "USER must not be 'root'"
}
