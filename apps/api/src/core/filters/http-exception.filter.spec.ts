import {
  ArgumentsHost,
  BadRequestException,
  HttpException,
  HttpStatus,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  describeException, HttpExceptionFilter,
} from './http-exception.filter';

interface MockResponse {
  status: jest.Mock;
  json: jest.Mock;
}

interface HostFixture {
  host: ArgumentsHost;
  response: MockResponse;
}

function createHost (method: string, url: string): HostFixture {
  const response: MockResponse = {
    status: jest.fn(),
    json: jest.fn(),
  };
  response.status.mockReturnValue(response);

  const host = {
    switchToHttp: () => ({
      getRequest: () => ({
        method,
        url,
      }),
      getResponse: () => response,
    }),
  } as unknown as ArgumentsHost;

  return {
    host,
    response,
  };
}

describe('describeException', () => {
  it('turns ValidationPipe messages into details behind a fixed summary', () => {
    const exception = new BadRequestException(['name must be a string', 'age must be positive']);

    expect(describeException(exception)).toEqual({
      statusCode: HttpStatus.BAD_REQUEST,
      error: 'Bad Request',
      message: 'Validation failed',
      details: ['name must be a string', 'age must be positive'],
    });
  });

  it('keeps the message of a plain HttpException', () => {
    expect(describeException(new NotFoundException('Tank 42 not found'))).toEqual({
      statusCode: HttpStatus.NOT_FOUND,
      error: 'Not Found',
      message: 'Tank 42 not found',
    });
  });

  it('derives the reason phrase and keeps the exception message when the body carries none', () => {
    const exception = new ServiceUnavailableException({ status: 'error' });

    expect(describeException(exception)).toEqual({
      statusCode: HttpStatus.SERVICE_UNAVAILABLE,
      error: 'Service Unavailable',
      message: exception.message,
    });
  });

  it('uses the reason phrase for a string-bodied HttpException', () => {
    expect(describeException(new HttpException('Teapot', HttpStatus.I_AM_A_TEAPOT))).toEqual({
      statusCode: HttpStatus.I_AM_A_TEAPOT,
      error: 'I Am A Teapot',
      message: 'Teapot',
    });
  });

  it('hides anything that is not an HttpException behind a 500', () => {
    expect(describeException(new Error('db password is hunter2'))).toEqual({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'Internal Server Error',
      message: 'Internal Server Error',
    });
  });
});

describe('HttpExceptionFilter', () => {
  it('writes the ErrorResponseDto shape with the request path', () => {
    const {
      host, response,
    } = createHost('GET', '/api/tanks/42');

    // eslint-disable-next-line promise/valid-params -- ExceptionFilter.catch is not Promise.catch
    new HttpExceptionFilter().catch(new NotFoundException('Tank 42 not found'), host);

    expect(response.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(response.json).toHaveBeenCalledWith(expect.objectContaining({
      statusCode: HttpStatus.NOT_FOUND,
      error: 'Not Found',
      message: 'Tank 42 not found',
      path: '/api/tanks/42',
      timestamp: expect.any(String),
    }));
  });

  it('answers 500 without leaking the original error', () => {
    const {
      host, response,
    } = createHost('POST', '/api/tanks');

    // eslint-disable-next-line promise/valid-params -- ExceptionFilter.catch is not Promise.catch
    new HttpExceptionFilter().catch(new TypeError('boom'), host);

    expect(response.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    const body: unknown = response.json.mock.calls[0][0];
    expect(JSON.stringify(body)).not.toContain('boom');
  });
});
