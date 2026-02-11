const NetworkSpeed = require('network-speed');

// Mock the NetworkSpeed module
jest.mock('network-speed');

describe('getNetworkDownloadSpeed', () => {
    let testNetworkSpeed;
    let getNetworkDownloadSpeed;

    beforeEach(() => {
        jest.resetModules();
        jest.clearAllMocks();
        
        // Import the function after mocking
        const indexModule = require('./index');
        getNetworkDownloadSpeed = indexModule.getNetworkDownloadSpeed;

        // Retrieve the instance using the Mock class
        const NetworkSpeedMock = require('network-speed');
        testNetworkSpeed = NetworkSpeedMock.mock.instances[NetworkSpeedMock.mock.instances.length - 1];
    });

    test('should return speed object on successful download speed check', async () => {
        const mockSpeed = { mbps: 85.5 };
        testNetworkSpeed.checkDownloadSpeed.mockResolvedValue(mockSpeed);

        const result = await getNetworkDownloadSpeed();

        expect(testNetworkSpeed.checkDownloadSpeed).toHaveBeenCalledWith(
            'https://eu.httpbin.org/stream-bytes/500000',
            50000000
        );
        expect(result).toEqual(mockSpeed);
    });

    test('should handle errors and log error message', async () => {
        const mockError = new Error('Network error');
        testNetworkSpeed.checkDownloadSpeed.mockRejectedValue(mockError);
        console.log = jest.fn();

        await getNetworkDownloadSpeed();

        expect(console.log).toHaveBeenCalledWith('error ekak down speed eke: ' + mockError);
    });

    test('should call checkDownloadSpeed with correct parameters', async () => {
        testNetworkSpeed.checkDownloadSpeed.mockResolvedValue({ mbps: 100 });

        await getNetworkDownloadSpeed();

        expect(testNetworkSpeed.checkDownloadSpeed).toHaveBeenCalledTimes(1);
        expect(testNetworkSpeed.checkDownloadSpeed).toHaveBeenCalledWith(
            'https://eu.httpbin.org/stream-bytes/500000',
            50000000
        );
    });
});