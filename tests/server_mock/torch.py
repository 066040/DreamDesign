import contextlib, types
class _Cuda:
    class OutOfMemoryError(RuntimeError): pass
    @staticmethod
    def is_available(): return False
    @staticmethod
    def empty_cache(): pass
cuda=_Cuda()
@contextlib.contextmanager
def no_grad(): yield
def cat(x,dim=0):
    import numpy as np
    return np.concatenate(x,dim)
