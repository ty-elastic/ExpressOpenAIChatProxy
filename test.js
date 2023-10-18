import { 
    generateAccessKey,
    checkAuth,
    generateJwt
} from "./functions.js"

async function static_tests() {
    let legacyKey = generateAccessKey(new Date());

    if (!await checkAuth("Bearer " + legacyKey)) {
        throw "legacy auth failed";
    }

    if (await checkAuth(legacyKey)) {
        throw "legacy auth failed";
    }

    legacyKey = legacyKey.replace(/[^a-zA-Z0-9-_\s]/g, '');
    if (!await checkAuth("Bearer " + legacyKey)) {
        throw "legacy auth failed";
    }

    let jwt = await generateJwt(Date.parse("2075-05-11"), "abc123", Date.parse("1975-05-11"));
    if (!await checkAuth("Bearer " + jwt)) {
        throw "jwt auth failed 1";
    }

    if (!await checkAuth("Bearer " + jwt)) {
        throw "jwt auth failed 2";
    }

    if (!await checkAuth(jwt)) {
        throw "jwt auth failed 3";
    }

    jwt = await generateJwt(Date.parse("1975-05-11"), "abc123");
    if (await checkAuth("Bearer " + jwt)) {
        throw "jwt auth failed 4";
    }

    jwt = await generateJwt(Date.parse("1975-05-11"), "abc123", Date.parse("2075-05-11"));
    if (await checkAuth("Bearer " + jwt)) {
        throw "jwt auth failed 5";
    }
}

(async () => {
    try {
        await static_tests()
    } catch (e) {
        console.log(e)
    }
})();
