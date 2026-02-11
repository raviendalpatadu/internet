const { beforeEach, afterEach, describe, test, expect } = require("@jest/globals");
const NetworkSpeed = require("network-speed");

// Mock the NetworkSpeed module
jest.mock("network-speed");

// Mock axios globally for the whole file
jest.mock("axios");
const axios = require("axios");

describe("Unit Tests", () => {
    // We mock index.js functions for the integration tests of routes, 
    // but we need the real functions for their specific unit tests.
    // However, index.js requires express, etc. 
    // To cleanly test, we usually rely on jest.isolateModules or careful require/re-require

    describe("getNetworkDownloadSpeed", () => {
        let testNetworkSpeed;
        let getNetworkDownloadSpeed;

        beforeEach(() => {
            jest.resetModules();
            jest.clearAllMocks();

            // Setup NetworkSpeed mock instance
            const NetworkSpeedMock = require("network-speed");
            // Since index.js does `new NetworkSpeed()`, we grab the instance
            // We need to require index.js *after* setting up mocks usually, 
            // OR we assume the mock is hoisted and we can get the instance from the mock constructor.
            
            // Require index to trigger the 'new NetworkSpeed()'
            const indexModule = require("./index");
            getNetworkDownloadSpeed = indexModule.getNetworkDownloadSpeed;

            // Get the instance that was created in index.js
            testNetworkSpeed = NetworkSpeedMock.mock.instances[0];
        });

        test("should return speed object on successful download speed check", async () => {
            const mockSpeed = { mbps: 85.5 };
            // Ensure the mock instance exists before programming it
            if (testNetworkSpeed) {
                testNetworkSpeed.checkDownloadSpeed.mockResolvedValue(mockSpeed);
            } else {
                // If instance capturing failed, we might need a different approach, 
                // but usually instances[0] works if index.js is loaded fresh.
                throw new Error("NetworkSpeed instance not captured. Mock setup failed.");
            }

            const result = await getNetworkDownloadSpeed();

            expect(testNetworkSpeed.checkDownloadSpeed).toHaveBeenCalledWith(
                "https://eu.httpbin.org/stream-bytes/500000",
                50000000,
            );
            expect(result).toEqual(mockSpeed);
        });

        test("should handle errors and log error message", async () => {
            if (!testNetworkSpeed) throw new Error("NetworkSpeed instance not found");
            
            const mockError = new Error("Network error");
            testNetworkSpeed.checkDownloadSpeed.mockRejectedValue(mockError);
            console.log = jest.fn();

            await getNetworkDownloadSpeed();

            expect(console.log).toHaveBeenCalledWith(
                "error ekak down speed eke: " + mockError,
            );
        });
    });

    describe("getNetworkUploadSpeed", () => {
        let testNetworkSpeed;
        let getNetworkUploadSpeed;

        beforeEach(() => {
            jest.resetModules();
            jest.clearAllMocks();
            
            const indexModule = require("./index");
            getNetworkUploadSpeed = indexModule.getNetworkUploadSpeed;
            
            const NetworkSpeedMock = require("network-speed");
            testNetworkSpeed = NetworkSpeedMock.mock.instances[0];
        });

        test("should return speed object on successful upload speed check", async () => {
            if (!testNetworkSpeed) throw new Error("NetworkSpeed instance not found");
            
            const mockSpeed = { mbps: 45.3 };
            testNetworkSpeed.checkUploadSpeed.mockResolvedValue(mockSpeed);

            const result = await getNetworkUploadSpeed();

            expect(testNetworkSpeed.checkUploadSpeed).toHaveBeenCalledWith(
                expect.objectContaining({
                    hostname: "www.facebook.com",
                    port: 80,
                    path: "/catchers/544b09b4599c1d0200000289",
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                }),
                2000000,
            );
            expect(result).toEqual(mockSpeed);
        });

        test("should handle errors and log error message", async () => {
            if (!testNetworkSpeed) throw new Error("NetworkSpeed instance not found");

            const mockError = new Error("Upload failed");
            testNetworkSpeed.checkUploadSpeed.mockRejectedValue(mockError);
            console.log = jest.fn();

            await getNetworkUploadSpeed();

            expect(console.log).toHaveBeenCalledWith(
                "error ekak up speed eke: " + mockError,
            );
        });
    });

    describe("getPing", () => {
        let getPing;
        let pingMock;

        beforeEach(() => {
            jest.resetModules();
            jest.clearAllMocks();

            // Mock 'ping' module before requiring index.js
            jest.mock("ping", () => ({
                promise: {
                    probe: jest.fn(),
                },
            }));
            
            // Require index.js which uses the mocked ping
            const indexModule = require("./index");
            getPing = indexModule.getPing;
            
            // Get reference to the mock
            pingMock = require("ping");
        });

        test("should return average ping and packet loss for all hosts", async () => {
            pingMock.promise.probe
                .mockResolvedValueOnce({ time: 20, packetLoss: "0" })
                .mockResolvedValueOnce({ time: 30, packetLoss: "0" })
                .mockResolvedValueOnce({ time: 25, packetLoss: "5" });

            const result = await getPing();

            expect(result).toEqual({ avg: 25, loss: 5 / 3 });
        });

        test("should handle errors and return default values", async () => {
            const mockError = new Error("Ping failed");
            pingMock.promise.probe.mockRejectedValue(mockError);
            console.log = jest.fn();

            const result = await getPing();

            expect(console.log).toHaveBeenCalledWith(
                "error ekak ping eke: " + mockError,
            );
            expect(result).toEqual({ avg: 0, loss: 0 });
        });
    });

    describe("getLocation", () => {
        let getLocation;

        beforeEach(() => {
            jest.resetModules();
            jest.clearAllMocks();
            jest.mock("axios");
            
            const indexModule = require("./index");
            getLocation = indexModule.getLocation;
        });

        test("should return location data when x-forwarded-for header is present", async () => {
            const mockLocationData = {
                isp: "ISP Name",
                ip_address: "192.168.1.1",
                organization: "Org Name",
                city: "City",
                state_prov: "State",
                country_name: "Country",
            };

            const axios = require("axios");
            axios.get.mockResolvedValue({ data: mockLocationData });

            const req = {
                headers: { "x-forwarded-for": "10.0.0.1, 192.168.1.1" },
                connection: { remoteAddress: "127.0.0.1" },
            };
            const res = {};

            const result = await getLocation(req, res);

            expect(result).toEqual(mockLocationData);
            // It should take the last IP " 192.168.1.1"
            expect(axios.get).toHaveBeenCalledWith(expect.stringContaining("apiKey="));
        });

        test("should use remoteAddress when x-forwarded-for header is missing", async () => {
            const mockLocationData = { ip_address: "127.0.0.1" };
            const axios = require("axios");
            axios.get.mockResolvedValue({ data: mockLocationData });

            const req = {
                headers: {},
                connection: { remoteAddress: "127.0.0.1" },
            };
            
            const result = await getLocation(req, {});
            expect(result).toEqual(mockLocationData);
        });

        test("should handle axios errors", async () => {
            const axios = require("axios");
            const mockError = new Error("API Error");
            axios.get.mockRejectedValue(mockError);
            console.log = jest.fn();

            const req = { headers: {}, connection: { remoteAddress: "1.1.1.1" } };
            // index.js getLocation logic: catches in outer try/catch OR inner promise catch.
            // The inner promise catch logs "error in geolocation api".
            // However, since we await a promise that might fulfill with undefined if the .catch block handles it...
            // Wait, in index.js: let location = axios.get().then().catch(); return location;
            // The function returns the Promise object 'location'.
            // When we await getLocation(), we await that promise chain.
            // If .catch handles the rejection, the promise resolves to undefined.
            
            await getLocation(req, {});
            
            // The console.log inside the .catch block
            expect(console.log).toHaveBeenCalledWith(expect.stringContaining("error in geolocation api"));
        });
        
        test("should handle unexpected errors in function body (outer try/catch)", async () => {
            console.log = jest.fn();
            // Passing null req triggers error when reading req.headers
            await getLocation(null, {});
            expect(console.log).toHaveBeenCalledWith(expect.stringContaining("error ekak getloc() eke"));
        });
    });

    describe("Express Routes", () => {
        let app;
        let mockReq, mockRes;

        beforeEach(() => {
            jest.resetModules();
            jest.clearAllMocks();
            jest.mock("axios");
            jest.mock("ping", () => ({ promise: { probe: jest.fn() } }));
            jest.mock("network-speed");

            // Define mockRes here so it's fresh for every test
            mockRes = {
                render: jest.fn(),
                send: jest.fn(),
            };

            const indexModule = require("./index");
            app = indexModule.app;
        });

        describe("GET /", () => {
            test("should render index with location data", async () => {
                const axios = require("axios");
                axios.get.mockResolvedValue({ 
                    data: { 
                        isp: "ISP", ip_address: "1.2.3.4", organization: "Org", 
                        city: "City", state_prov: "State", country_name: "Country" 
                    } 
                });

                mockReq = { headers: {}, connection: { remoteAddress: "1.2.3.4" } };

                // Simulate route handler
                const route = app._router.stack.find(r => r.route && r.route.path === '/').route;
                await route.stack[0].handle(mockReq, mockRes);

                expect(mockRes.render).toHaveBeenCalledWith("index", expect.objectContaining({
                    ispName: "ISP",
                    ipAddress: "1.2.3.4"
                }));
            });

            test("should handle errors in route", async () => {
                // To trigger the outer try/catch in app.get("/"), we need getLocation to throw 
                // OR something else to fail. 
                // Currently getLocation handles its own errors and returns undefined on failure.
                // If getLocation returns undefined, accessing locData.isp throws TypeError.
                // This will trigger the catch block in the route.
                
                const axios = require("axios");
                axios.get.mockRejectedValue(new Error("Fail")); 
                // getLocation catches this and returns undefined (implicit return of .catch if no return provided) 
                // actually index.js catch blocks just console.log, so they return undefined.

                mockReq = { headers: {}, connection: { remoteAddress: "1.2.3.4" } };
                console.log = jest.fn(); // Suppress logs

                const route = app._router.stack.find(r => r.route && r.route.path === '/').route;
                await route.stack[0].handle(mockReq, mockRes);

                expect(mockRes.render).toHaveBeenCalledWith("index", expect.objectContaining({
                    ispName: "Error"
                }));
            });
        });

        describe("GET /checkspeed", () => {
            test("should send speed data on success", async () => {
                // Mock helpers by mocking modules they rely on, OR mock the imported functions.
                // Since `index.js` defines functions internally and calls them, we can't easily spy on `indexModule.getNetworkDownloadSpeed` 
                // because the route uses the internal reference, not the exported one.
                // So we assume the internal functions work (covered by unit tests) and expect their outcome.
                
                // We need to mock what those internal functions use.
                
                // 1. Mock NetworkSpeed for download/upload
                const NetworkSpeedMock = require("network-speed");
                const nsInstance = NetworkSpeedMock.mock.instances[0];
                if(nsInstance) {
                    nsInstance.checkDownloadSpeed.mockResolvedValue({ mbps: 100 });
                    nsInstance.checkUploadSpeed.mockResolvedValue({ mbps: 50 });
                }

                // 2. Mock Ping
                const ping = require("ping");
                ping.promise.probe.mockResolvedValue({ time: 10, packetLoss: "0" });

                // 3. Mock Axios for location
                const axios = require("axios");
                axios.get.mockResolvedValue({ 
                    data: { 
                        ip: "1.2.3.4", organization: "Org", city: "City", 
                        state_prov: "State", country_name: "Country" 
                    } 
                });

                mockReq = { headers: {}, connection: { remoteAddress: "1.2.3.4" } };

                const route = app._router.stack.find(r => r.route && r.route.path === '/checkspeed').route;
                await route.stack[0].handle(mockReq, mockRes);

                expect(mockRes.send).toHaveBeenCalledWith(expect.objectContaining({
                    upspeed: 100,
                    downspeed: 50
                }));
            });

            test("should handle errors in checkspeed route", async () => {
                // Force an error. E.g. make getNetworkDownloadSpeed throw.
                // getNetworkDownloadSpeed catches errors and returns undefined.
                // Then `ups.mbps` throws TypeError. Catch block should activate.
                
                const NetworkSpeedMock = require("network-speed");
                const nsInstance = NetworkSpeedMock.mock.instances[0];
                if(nsInstance) {
                    nsInstance.checkDownloadSpeed.mockRejectedValue(new Error("Fail"));
                }
                console.log = jest.fn();

                mockReq = { headers: {}, connection: { remoteAddress: "1.2.3.4" } };
                
                const route = app._router.stack.find(r => r.route && r.route.path === '/checkspeed').route;
                await route.stack[0].handle(mockReq, mockRes);

                expect(mockRes.render).toHaveBeenCalledWith("index", expect.objectContaining({
                    ispName: "Error"
                }));
            });
        });
    });
});
